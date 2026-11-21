from hashlib import sha256
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from src.application.use_cases.inventory import StockService
from src.domain.inventory.stock import Action, Category, Product, StockCommand, StockError
from src.interfaces.dependencies import inventory_service
from src.interfaces.http.routers.accounts import client_request
from src.interfaces.http.schemas.inventory import (
    InventoryView,
    ProductEdit,
    RegistrationInput,
    StockInput,
)

router = APIRouter(prefix="/inventory", tags=["物资"], dependencies=[Depends(client_request)])
Service = Annotated[StockService, Depends(inventory_service, scope="function")]


def command(body: StockInput, payload: str) -> StockCommand:
    return StockCommand(
        str(body.request_id),
        body.action,
        body.quantity,
        str(body.source_id) if body.source_id else None,
        body.expected,
        body.location,
        body.expiry,
        body.lot,
        body.note,
        sha256(payload.encode()).hexdigest(),
        body.units_per_pack,
    )


@router.get("")
async def list_inventory(category: Category, svc: Service) -> list[InventoryView]:
    return [InventoryView.of(view) for view in await svc.list(category)]


@router.post("", status_code=201)
async def register_stock(body: RegistrationInput, svc: Service) -> str:
    if body.receipt.action != Action.RECEIVE:
        raise StockError("登记时需要一条入库记录")
    details = body.details.model_dump()
    product = Product(
        str(body.receipt.request_id),
        svc.actor,
        body.category,
        body.name,
        body.unit,
        details,
        body.minimum,
        body.warning_days,
    )
    await svc.register(product, command(body.receipt, body.model_dump_json()))
    return product.id


@router.put("/{product_id}", status_code=204)
async def update_product(product_id: UUID, body: ProductEdit, svc: Service) -> Response:
    await svc.edit(
        str(product_id), body.name, body.details.model_dump(), body.minimum, body.warning_days
    )
    return Response(status_code=204)


@router.post("/{product_id}/movements", status_code=204)
async def add_movement(product_id: UUID, body: StockInput, svc: Service) -> Response:
    await svc.apply(str(product_id), command(body, body.model_dump_json()))
    return Response(status_code=204)
