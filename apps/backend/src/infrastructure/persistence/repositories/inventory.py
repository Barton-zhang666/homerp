from collections.abc import Sequence
from dataclasses import asdict

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.inventory.stock import Action, Category, Movement, Product, StockError
from src.infrastructure.persistence.models.inventory import MovementRow, ProductRow


def product(row: ProductRow) -> Product:
    return Product(
        row.id,
        row.owner_id,
        Category(row.category),
        row.name,
        row.unit,
        row.details,
        row.minimum,
        row.warning_days,
    )


class SqlInventory:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def products(self, category: Category) -> list[Product]:
        rows = await self.db.scalars(
            select(ProductRow)
            .where(ProductRow.category == category)
            .order_by(ProductRow.name, ProductRow.id)
        )
        return [product(row) for row in rows]

    async def find(self, product_id: str, *, lock: bool = False) -> Product | None:
        query = select(ProductRow).where(ProductRow.id == product_id)
        if lock:
            query = query.with_for_update()
        row = await self.db.scalar(query)
        return product(row) if row else None

    async def create(self, entry: Product) -> None:
        self.db.add(ProductRow(**asdict(entry)))
        try:
            await self.db.flush()
        except IntegrityError as exc:
            raise StockError("无法登记该品目，请刷新名册后重试") from exc

    async def update(self, entry: Product) -> None:
        await self.db.execute(
            update(ProductRow)
            .where(ProductRow.id == entry.id)
            .values(
                name=entry.name,
                details=entry.details,
                minimum=entry.minimum,
                warning_days=entry.warning_days,
            )
        )

    async def history(self, product_ids: Sequence[str]) -> list[Movement]:
        query = (
            select(MovementRow)
            .where(MovementRow.product_id.in_(product_ids))
            .order_by(MovementRow.sequence)
        )
        rows = await self.db.scalars(query)
        return [
            Movement(
                r.id,
                r.product_id,
                r.actor_id,
                Action(r.action),
                r.occurred_at,
                r.source_id,
                r.source_delta,
                r.destination_quantity,
                r.location,
                r.custody,
                r.expiry,
                r.lot,
                r.note,
                r.fingerprint,
                r.reverses,
            )
            for r in rows
        ]

    async def record(self, movement: Movement) -> None:
        self.db.add(MovementRow(**asdict(movement)))
        await self.db.flush()
