from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from src.application.use_cases.inventory import StockView
from src.domain.inventory.stock import Action, Category, expiry_status

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)]
Text = Annotated[str, StringConstraints(strip_whitespace=True, max_length=128)]
LongText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=512)]
Quantity = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=3)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ProductDetails(Input):
    brand: Text = ""
    alias: Text = ""
    specification: Text = ""
    form: Text = ""
    tags: Text = ""
    ingredients: LongText = ""
    allergens: LongText = ""
    instructions: LongText = ""


class ProductEdit(Input):
    name: Title
    details: ProductDetails = Field(default_factory=ProductDetails)
    minimum: Quantity | None = None
    warning_days: int = Field(default=7, ge=0, le=365)


class StockInput(Input):
    request_id: UUID
    action: Action
    quantity: Quantity = Decimal(1)
    units_per_pack: Quantity | None = None
    source_id: UUID | None = None
    expected: Quantity | None = None
    location: Text = ""
    expiry: str = Field(default="", max_length=10)
    lot: Text = ""
    note: LongText = ""


class RegistrationInput(ProductEdit):
    category: Category
    unit: Annotated[str, StringConstraints(min_length=1, max_length=16)] = "件"
    receipt: StockInput


class HoldingView(BaseModel):
    id: str
    location: str
    custody: str
    remaining: Decimal
    expiry: str
    lot: str
    status: str
    opened: bool
    received_by: str


class MovementView(BaseModel):
    id: str
    actor_id: str
    action: Action
    occurred_at: datetime
    source_id: str | None
    source_delta: Decimal
    destination_quantity: Decimal
    expiry: str
    lot: str
    location: str
    note: str
    reverses: str | None


class InventoryView(BaseModel):
    id: str
    owner_id: str
    category: Category
    name: str
    unit: str
    details: ProductDetails
    minimum: Decimal | None
    warning_days: int
    owned: Decimal
    available: Decimal
    holdings: list[HoldingView]
    history: list[MovementView]

    @classmethod
    def of(cls, view: StockView) -> "InventoryView":
        product = view.product
        holdings: list[HoldingView] = []
        for h in view.holdings:
            holdings.append(
                HoldingView(
                    id=h.id,
                    location=h.location,
                    custody=h.custody,
                    remaining=h.remaining,
                    expiry=h.expiry,
                    lot=h.lot,
                    opened=h.opened,
                    received_by=h.received_by,
                    status=expiry_status(
                        product.category, h.expiry, date.today(), product.warning_days
                    ),
                )
            )
        history = [
            MovementView.model_validate(m, from_attributes=True).model_copy(
                update={"occurred_at": m.occurred_at.replace(tzinfo=UTC)}
            )
            for m in reversed(view.history)
        ]
        return cls(
            id=product.id,
            owner_id=product.owner_id,
            category=product.category,
            name=product.name,
            unit=product.unit,
            details=ProductDetails.model_validate(product.details),
            minimum=product.minimum,
            warning_days=product.warning_days,
            owned=sum((h.remaining for h in holdings), Decimal(0)),
            available=sum(
                (
                    h.remaining
                    for h in holdings
                    if h.custody == "home" and h.status not in {"expired", "verify", "unknown"}
                ),
                Decimal(0),
            ),
            holdings=holdings,
            history=history,
        )
