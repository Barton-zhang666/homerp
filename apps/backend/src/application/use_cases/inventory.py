from collections import defaultdict
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from decimal import Decimal

from src.domain.inventory.stock import (
    Action,
    Category,
    Holding,
    Inventory,
    Movement,
    Product,
    StockCommand,
    StockError,
    balances,
    change_stock,
    check_expiry,
    validate_details,
    validate_quantity,
)


class MissingStock(Exception):
    pass


class NotStockOwner(Exception):
    pass


@dataclass(frozen=True)
class StockView:
    product: Product
    holdings: list[Holding]
    history: list[Movement]


class StockService:
    def __init__(self, repo: Inventory, actor: str):
        self.repo = repo
        self.actor = actor

    async def list(self, category: Category) -> list[StockView]:
        products = await self.repo.products(category)
        histories: dict[str, list[Movement]] = defaultdict(list)
        for entry in await self.repo.history([p.id for p in products]):
            histories[entry.product_id].append(entry)
        return [
            StockView(p, list(balances(histories[p.id]).values()), histories[p.id])
            for p in products
        ]

    async def register(self, product: Product, cmd: StockCommand) -> None:
        validate_details(product.category, product.details)
        if product.minimum is not None:
            validate_quantity(product.minimum, product.unit)
        existing = await self.repo.find(product.id)
        if existing is None:
            await self.repo.create(product)
        elif existing.owner_id != self.actor:
            raise NotStockOwner
        await self.apply(product.id, cmd)

    async def edit(
        self,
        product_id: str,
        name: str,
        details: dict[str, str],
        minimum: Decimal | None,
        warning_days: int,
    ) -> None:
        p = await self.repo.find(product_id, lock=True)
        if p is None:
            raise MissingStock
        if p.owner_id != self.actor:
            raise NotStockOwner
        if minimum is not None:
            validate_quantity(minimum, p.unit)
        validate_details(p.category, details)
        await self.repo.update(
            replace(p, name=name, details=details, minimum=minimum, warning_days=warning_days)
        )

    async def apply(self, product_id: str, cmd: StockCommand) -> None:
        p = await self.repo.find(product_id, lock=True)
        if p is None:
            raise MissingStock
        # Every writer locks this product before reading balances and appending.
        history = await self.repo.history([product_id])
        for prior in history:
            if prior.id == cmd.id:
                if prior.actor_id != self.actor or prior.fingerprint != cmd.fingerprint:
                    raise StockError("重复请求与原操作不一致")
                return
        holdings = balances(history)
        cmd = cmd.unpack(p.unit)
        entry = Movement(
            cmd.id,
            p.id,
            self.actor,
            cmd.action,
            datetime.now(UTC).replace(tzinfo=None),
            cmd.source_id,
            Decimal(0),
            Decimal(0),
            cmd.location,
            "home",
            cmd.expiry,
            cmd.lot,
            cmd.note,
            cmd.fingerprint,
        )
        if cmd.action == Action.UNDO:
            original = next((h for h in history if h.id == cmd.source_id), None)
            if (
                original is None
                or original.action == Action.UNDO
                or any(h.reverses == original.id for h in history)
            ):
                raise StockError("请选择尚未撤回的原始流水")
            if original.actor_id != self.actor:
                raise NotStockOwner
            if (
                original.destination_quantity
                and holdings[original.id].remaining != original.destination_quantity
            ):
                raise StockError("这批数量已发生变化，请先核对后续流水")
            entry = replace(entry, source_id=None, reverses=original.id)
            if any(h.remaining < 0 for h in balances([*history, entry]).values()):
                raise StockError("后续记录已经使用该批库存，无法完整撤回")
        else:
            validate_quantity(cmd.quantity, p.unit)
            if cmd.action != Action.COUNT and not cmd.quantity:
                raise StockError("数量必须大于零")
            if cmd.action == Action.RECEIVE:
                if cmd.source_id:
                    raise StockError("入库不能指定来源库存")
                check_expiry(p.category, cmd.expiry)
                entry = replace(
                    entry, location=cmd.location or "未指定", destination_quantity=cmd.quantity
                )
            else:
                source = holdings.get(cmd.source_id or "")
                if not source or any(h.reverses == cmd.source_id for h in history):
                    raise StockError("找不到来源批次")
                if cmd.action == Action.VERIFY and self.actor != source.received_by:
                    raise NotStockOwner
                entry = change_stock(p, cmd, entry, source)
        await self.repo.record(entry)
