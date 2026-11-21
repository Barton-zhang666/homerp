from collections.abc import Sequence
from dataclasses import dataclass, replace
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Protocol


class Category(StrEnum):
    ITEM = "item"
    FOOD = "food"
    MEDICINE = "medicine"


class Action(StrEnum):
    RECEIVE = "receive"
    MOVE = "move"
    LEND = "lend"
    RETURN = "return"
    REPAIR = "repair"
    RETRIEVE = "retrieve"
    USE = "use"
    DISCARD = "discard"
    COUNT = "count"
    OPEN = "open"
    VERIFY = "verify_date"
    UNDO = "undo"


class StockError(ValueError):
    pass


@dataclass(frozen=True)
class Product:
    id: str
    owner_id: str
    category: Category
    name: str
    unit: str
    details: dict[str, str]
    minimum: Decimal | None
    warning_days: int


@dataclass(frozen=True)
class Movement:
    id: str
    product_id: str
    actor_id: str
    action: Action
    occurred_at: datetime
    source_id: str | None
    source_delta: Decimal
    destination_quantity: Decimal
    location: str
    custody: str
    expiry: str
    lot: str
    note: str
    fingerprint: str
    reverses: str | None = None


@dataclass(frozen=True)
class Holding:
    id: str
    location: str
    custody: str
    expiry: str
    lot: str
    remaining: Decimal
    opened: bool
    received_by: str


def expiry_status(category: Category, expiry: str, today: date, days: int) -> str:
    if category == Category.ITEM:
        return "available"
    if expiry == "fresh":
        return "fresh"
    if not expiry:
        return "unknown"
    if len(expiry) == 7:
        month = today.isoformat()[:7]
        if expiry == month:
            return "verify"
        if expiry < month:
            return "expired"
        # Only the month is printed. Use its first day for advance reminders.
        expiry += "-01"
    remaining = (date.fromisoformat(expiry) - today).days
    if remaining < 0:
        return "expired"
    if remaining == 0:
        return "today"
    return "soon" if remaining <= days else "available"


def validate_quantity(quantity: Decimal, unit: str) -> None:
    if (
        quantity < 0
        or quantity > Decimal("999999999.999")
        or quantity != quantity.quantize(Decimal(".001"))
    ):
        raise StockError("数量超出范围，最多保留三位小数")
    if (
        unit.lower() not in {"克", "千克", "毫升", "升", "g", "kg", "ml", "l"}
        and quantity != quantity.to_integral_value()
    ):
        raise StockError("这个库存单位需要填写整数")


def balances(history: Sequence[Movement]) -> dict[str, Holding]:
    holdings: dict[str, Holding] = {}
    originals: dict[str, Movement] = {}
    for entry in history:
        if entry.reverses:
            original = originals[entry.reverses]
            if original.destination_quantity:
                old = holdings[original.id]
                holdings[old.id] = replace(
                    old, remaining=old.remaining - original.destination_quantity
                )
            if original.source_id:
                old = holdings[original.source_id]
                holdings[old.id] = replace(old, remaining=old.remaining - original.source_delta)
            continue
        originals[entry.id] = entry
        if entry.source_id:
            old = holdings[entry.source_id]
            holdings[old.id] = replace(old, remaining=old.remaining + entry.source_delta)
        if entry.destination_quantity:
            holdings[entry.id] = Holding(
                entry.id,
                entry.location,
                entry.custody,
                entry.expiry,
                entry.lot,
                entry.destination_quantity,
                entry.action == Action.OPEN
                or bool(entry.source_id and holdings[entry.source_id].opened),
                holdings[entry.source_id].received_by if entry.source_id else entry.actor_id,
            )
    return holdings


class Inventory(Protocol):
    async def products(self, category: Category) -> list[Product]: ...
    async def find(self, product_id: str, *, lock: bool = False) -> Product | None: ...
    async def create(self, product: Product) -> None: ...
    async def update(self, product: Product) -> None: ...
    async def history(self, product_ids: Sequence[str]) -> list[Movement]: ...
    async def record(self, movement: Movement) -> None: ...


@dataclass(frozen=True)
class StockCommand:
    id: str
    action: Action
    quantity: Decimal
    source_id: str | None
    expected: Decimal | None
    location: str
    expiry: str
    lot: str
    note: str
    fingerprint: str
    units_per_pack: Decimal | None = None

    def unpack(self, unit: str) -> "StockCommand":
        if self.units_per_pack is None:
            return self
        if self.action != Action.RECEIVE or self.units_per_pack <= 0:
            raise StockError("仅入库时可填写正数包装换算")
        if self.quantity != self.quantity.to_integral_value():
            raise StockError("包装数需要填写整数")
        quantity = self.quantity * self.units_per_pack
        validate_quantity(quantity, unit)
        conversion = f"{self.quantity} 包 × {self.units_per_pack} {unit}/包 = {quantity} {unit}"
        note = " · ".join(filter(None, (conversion, self.note)))
        if len(note) > 512:
            raise StockError("换算与备注合计最多 512 字")
        return replace(self, quantity=quantity, note=note)


def validate_details(category: Category, details: dict[str, str]) -> None:
    restricted = {
        "form": Category.MEDICINE,
        "instructions": Category.MEDICINE,
        "ingredients": Category.FOOD,
        "allergens": Category.FOOD,
    }
    if any(details.get(key) and category != allowed for key, allowed in restricted.items()):
        raise StockError("资料字段不适用于当前分类")
    if category == Category.MEDICINE and not (details.get("form") and details.get("specification")):
        raise StockError("药品须填写剂型和规格")


def check_expiry(category: Category, value: str) -> None:
    if not value:
        return
    if category == Category.ITEM:
        raise StockError("物品无需填写到期日")
    if category == Category.FOOD and value == "fresh":
        return
    if len(value) == 7 and category == Category.MEDICINE:
        value += "-01"
    try:
        if date.fromisoformat(value).isoformat() != value:
            raise ValueError
    except ValueError as exc:
        raise StockError("请按包装填写有效日期") from exc


def change_stock(p: Product, cmd: StockCommand, entry: Movement, source: Holding) -> Movement:
    action = cmd.action
    expected_state = {Action.RETURN: "lent", Action.RETRIEVE: "repair"}.get(action, "home")
    if source.custody != expected_state:
        raise StockError("当前批次状态不支持该操作")
    if (
        action in {Action.LEND, Action.RETURN, Action.REPAIR, Action.RETRIEVE}
        and p.category != Category.ITEM
    ):
        raise StockError("借还与维修仅用于物品")
    if action == Action.COUNT:
        if cmd.expected != source.remaining:
            raise StockError(f"库存已变化，当前账面数量为 {source.remaining}，请刷新核对")
        delta = cmd.quantity - source.remaining
    else:
        if cmd.quantity > source.remaining:
            raise StockError(f"库存不足，当前剩余 {source.remaining}")
        delta = -cmd.quantity
    entry = replace(
        entry, source_delta=delta, lot=source.lot, expiry=source.expiry, location=source.location
    )
    if action in {Action.COUNT, Action.DISCARD, Action.USE}:
        if (
            action == Action.USE
            and p.category == Category.MEDICINE
            and expiry_status(p.category, source.expiry, date.today(), p.warning_days)
            in {"expired", "unknown", "verify"}
        ):
            raise StockError("该药品批次的有效期需要核对，只能清理或盘点")
        return entry
    if action == Action.VERIFY:
        if p.category == Category.ITEM or source.opened or not cmd.expiry:
            raise StockError("请核对未开封批次并填写包装日期")
        check_expiry(p.category, cmd.expiry)
        return replace(entry, destination_quantity=cmd.quantity, expiry=cmd.expiry)
    if action == Action.OPEN:
        if p.category == Category.ITEM or source.opened:
            raise StockError("请选择食品或药品的在家批次")
        if not cmd.expiry or len(cmd.expiry) != 10:
            raise StockError("请填写已确认的开封截止日")
        check_expiry(p.category, cmd.expiry)
        if source.expiry and len(source.expiry) != 10 and source.expiry != "fresh":
            raise StockError("请先核对包装有效期")
        if not source.expiry:
            raise StockError("开封前须核对包装有效期")
        expiry = min(source.expiry, cmd.expiry) if len(source.expiry) == 10 else cmd.expiry
        return replace(entry, destination_quantity=cmd.quantity, expiry=expiry)
    if not cmd.location:
        raise StockError("请填写目标位置、借用人或维修点")
    if action == Action.MOVE and source.location == cmd.location:
        raise StockError("目标位置与来源位置相同")
    custody = {Action.LEND: "lent", Action.REPAIR: "repair"}.get(action, "home")
    return replace(entry, location=cmd.location, custody=custody, destination_quantity=cmd.quantity)
