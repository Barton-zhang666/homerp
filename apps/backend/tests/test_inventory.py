from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest
from account_helpers import client, register
from httpx import AsyncClient

from src.domain.inventory.stock import Category, expiry_status


def movement(action: str, quantity: int | str = 1, **fields: object) -> dict[str, object]:
    return {"request_id": str(uuid4()), "action": action, "quantity": quantity, **fields}


async def products(c: AsyncClient, category: str) -> list[dict]:
    response = await c.get("/inventory", params={"category": category})
    assert response.status_code == 200
    return response.json()


@pytest.mark.usefixtures("database")
async def test_shared_stock_preserves_ownership_and_balances() -> None:
    async with client() as a, client() as b:
        assert (await a.get("/inventory?category=item")).status_code == 401
        await register(a, "owner")
        await register(b, "taker")
        receipt = movement("receive", 2, location="书房")
        body = {"category": "item", "name": "电钻", "receipt": receipt}
        created = await a.post("/inventory", json=body)
        assert created.status_code == 201, created.text
        product_id = created.json()
        assert (await a.post("/inventory", json=body)).json() == product_id
        url = f"/inventory/{product_id}/movements"
        assert (await b.put(f"/inventory/{product_id}", json={"name": "新名字"})).status_code == 403
        assert (await b.post(url, json=movement("undo", source_id=product_id))).status_code == 403
        loan = movement("lend", location="小林", source_id=product_id)
        for _ in range(2):
            assert (await b.post(url, json=loan)).status_code == 204
        assert (await b.post(url, json={**loan, "quantity": 2})).status_code == 409
        (row,) = await products(a, "item")
        assert Decimal(row["available"]) == 1
        assert Decimal(row["owned"]) == 2
        assert len(row["history"]) == 2
        assert (await a.post(url, json=movement("undo", source_id=product_id))).status_code == 409
        assert (
            await a.post(
                url, json=movement("return", source_id=loan["request_id"], location="客厅")
            )
        ).status_code == 204
        (row,) = await products(b, "item")
        assert Decimal(row["available"]) == 2
        assert {h["location"] for h in row["holdings"] if Decimal(h["remaining"])} == {
            "书房",
            "客厅",
        }
        assert (
            await a.post(url, json=movement("count", 0, expected=2, source_id=product_id))
        ).status_code == 409
        count = movement("count", 0, expected=1, source_id=product_id)
        assert (await a.post(url, json=count)).status_code == 204
        assert (
            await a.post(url, json=movement("undo", source_id=count["request_id"]))
        ).status_code == 204
        (row,) = await products(b, "item")
        assert Decimal(row["owned"]) == 2


@pytest.mark.usefixtures("database")
async def test_category_validation_and_partial_opening() -> None:
    async with client() as c:
        await register(c, "stock")
        for body in (
            {
                "category": "item",
                "name": "电钻",
                "receipt": movement("receive", expiry="2030-01-01"),
            },
            {"category": "item", "name": "电钻", "receipt": movement("receive", "0.5")},
            {"category": "medicine", "name": "测试药品", "receipt": movement("receive")},
        ):
            assert (await c.post("/inventory", json=body)).status_code == 409
        assert await products(c, "item") == []
        result = await c.post(
            "/inventory",
            json={
                "category": "food",
                "name": "酸奶",
                "unit": "杯",
                "receipt": movement("receive", 2, units_per_pack=3, expiry="2099-08-01"),
            },
        )
        assert result.status_code == 201
        source = result.json()
        assert (
            await c.post(
                f"/inventory/{source}/movements",
                json=movement("open", source_id=source, expiry="2099-07-01"),
            )
        ).status_code == 204
        (row,) = await products(c, "food")
        assert [(Decimal(h["remaining"]), h["expiry"], h["opened"]) for h in row["holdings"]] == [
            (5, "2099-08-01", False),
            (1, "2099-07-01", True),
        ]
        drug = await c.post(
            "/inventory",
            json={
                "category": "medicine",
                "name": "同名药",
                "unit": "片",
                "details": {"form": "片剂", "specification": "包装 A"},
                "receipt": movement("receive", 3, expiry="2020-07"),
            },
        )
        assert drug.status_code == 201
        assert (
            await c.post(
                f"/inventory/{drug.json()}/movements", json=movement("use", source_id=drug.json())
            )
        ).status_code == 409
        (row,) = await products(c, "medicine")
        assert Decimal(row["available"]) == 0 and Decimal(row["owned"]) == 3


@pytest.mark.usefixtures("database")
async def test_only_receipt_owner_can_confirm_packaging_after_move() -> None:
    async with client() as a, client() as b:
        await register(a, "buyer")
        await register(b, "helper")
        result = await a.post(
            "/inventory",
            json={
                "name": "果汁",
                "category": "food",
                "unit": "瓶",
                "receipt": movement("receive", 2),
            },
        )
        key = result.json()
        url = f"/inventory/{key}/movements"
        moved = movement("move", source_id=key, location="冰箱")
        assert (await b.post(url, json=moved)).status_code == 204
        dated = movement("verify_date", source_id=moved["request_id"], expiry="2099-10-01")
        assert (await b.post(url, json=dated)).status_code == 403
        assert (await a.post(url, json=dated)).status_code == 204
        (row,) = await products(a, "food")
        assert Decimal(row["owned"]) == 2 and Decimal(row["available"]) == 1


@pytest.mark.parametrize(
    ("label", "status"),
    [
        ("2026-11-21", "today"),
        ("2026-11-20", "expired"),
        ("2026-11", "verify"),
        ("2026-12-01", "available"),
        ("2026-11-25", "soon"),
        ("", "unknown"),
    ],
)
def test_expiry_boundaries(label: str, status: str) -> None:
    assert expiry_status(Category.MEDICINE, label, date(2026, 11, 21), 7) == status
