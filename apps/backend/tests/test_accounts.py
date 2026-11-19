from collections.abc import AsyncIterator
from datetime import datetime, timedelta

import httpx
import pytest
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.application.use_cases.accounts import digest
from src.infrastructure.persistence.models import Base, MemberRow, SessionRow
from src.interfaces import dependencies
from src.main import app


@pytest.fixture
async def database(
    monkeypatch: pytest.MonkeyPatch,
) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite://")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(dependencies, "get_session_factory", lambda: sessions)
    try:
        yield sessions
    finally:
        await engine.dispose()


def client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url="http://test",
        transport=httpx.ASGITransport(app=app),
        headers={"X-Homerp-Request": "1"},
    )


def credentials(name: str) -> dict[str, str]:
    return {"email": f"{name}@example.com", "password": "test-password-123"}


async def register(c: httpx.AsyncClient, name: str) -> str:
    response = await c.post("/auth/register", json={"name": name, **credentials(name)})
    assert response.status_code == 201, response.text
    assert "HttpOnly" in response.headers["set-cookie"]
    return str(response.json()["member"]["id"])


async def test_self_registration_and_shared_directory(
    database: async_sessionmaker[AsyncSession],
) -> None:
    async with client() as first, client() as second:
        assert (await first.get("/members")).status_code == 401
        first_id = await register(first, "first")
        second_id = await register(second, "second")
        duplicate = await second.post(
            "/auth/register", json={"name": "另一个称呼", **credentials("FIRST")}
        )
        assert duplicate.status_code == 409
        assert (await second.get("/auth/me")).json()["member"]["id"] == second_id
        profile = {"name": "小林", "contact": "家庭分机 102", "relationship": "姐姐"}
        assert (
            await second.put("/members/me", json={**profile, "id": first_id})
        ).status_code == 422
        assert (await second.put("/members/me", json=profile)).status_code == 200
        rows = (await first.get("/members")).json()
        assert len(rows) == 2
        assert all("email" not in row and "password_hash" not in row for row in rows)
        assert next(row for row in rows if row["id"] == second_id)["contact"] == profile["contact"]
        assert (await first.get("/auth/me")).json()["member"]["name"] == "first"
        async with database() as db:
            row = await db.get(MemberRow, first_id)
            assert row and row.password_hash.startswith("$argon2id$")
            assert await db.get(SessionRow, digest(first.cookies["homerp_session"]))


async def test_deactivation_and_password_change_revoke_every_session(
    database: async_sessionmaker[AsyncSession],
) -> None:
    async with client() as first, client() as other_device, client() as family:
        user_id = await register(first, "member")
        await register(family, "relative")
        auth = credentials("member")
        assert (await other_device.post("/auth/login", json=auth)).status_code == 200
        assert (await first.post("/auth/deactivate", json={"password": "wrong"})).status_code == 403
        assert (
            await first.post("/auth/deactivate", json={"password": auth["password"]})
        ).status_code == 204
        assert (await other_device.get("/auth/me")).status_code == 401
        roster = (await family.get("/members")).json()
        assert not next(m for m in roster if m["id"] == user_id)["active"]
        assert (await first.post("/auth/login", json=auth)).status_code == 403
        restored = await first.post("/auth/reactivate", json=auth)
        assert restored.json()["member"]["id"] == user_id
        assert (await other_device.get("/members")).status_code == 401
        await other_device.post("/auth/login", json=auth)
        new = "replacement-123"
        assert (
            await first.post(
                "/auth/password", json={"password": auth["password"], "new_password": new}
            )
        ).status_code == 204
        assert (await other_device.get("/members")).status_code == 401
        assert (await first.post("/auth/login", json=auth)).status_code == 403
        assert (await first.post("/auth/login", json={**auth, "password": new})).status_code == 200
        assert (await first.post("/auth/logout")).status_code == 204
        assert (await first.get("/auth/me")).status_code == 401


async def test_session_expiry_and_write_marker(database: async_sessionmaker[AsyncSession]) -> None:
    async with client() as c:
        await register(c, "expiry")
        c.headers.pop("X-Homerp-Request")
        assert (await c.post("/auth/logout")).status_code == 403
        async with database.begin() as db:
            await db.execute(
                update(SessionRow).values(expires_at=datetime.now() - timedelta(days=1))
            )
        assert (await c.get("/members")).status_code == 401
