from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.persistence.models.base import Base


class ProductRow(Base):
    __tablename__ = "inventory_products"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("members.id"))
    category: Mapped[str] = mapped_column(String(12), index=True)
    name: Mapped[str] = mapped_column(String(128))
    unit: Mapped[str] = mapped_column(String(16))
    details: Mapped[dict[str, str]] = mapped_column(JSON)
    minimum: Mapped[Decimal | None] = mapped_column(Numeric(12, 3))
    warning_days: Mapped[int]


class MovementRow(Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (UniqueConstraint("product_id", "id"),)
    sequence: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id: Mapped[str] = mapped_column(String(36))
    product_id: Mapped[str] = mapped_column(ForeignKey("inventory_products.id"))
    actor_id: Mapped[str] = mapped_column(ForeignKey("members.id"))
    action: Mapped[str] = mapped_column(String(12))
    occurred_at: Mapped[datetime]
    source_id: Mapped[str | None] = mapped_column(String(36))
    source_delta: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    destination_quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    location: Mapped[str] = mapped_column(String(128))
    custody: Mapped[str] = mapped_column(String(12))
    expiry: Mapped[str] = mapped_column(String(10))
    lot: Mapped[str] = mapped_column(String(128))
    note: Mapped[str] = mapped_column(String(512))
    fingerprint: Mapped[str] = mapped_column(String(64))
    reverses: Mapped[str | None] = mapped_column(String(36))
