from datetime import datetime, timedelta

import pytest
from account_helpers import client, credentials, register, registration
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.application.use_cases.accounts import digest
from src.infrastructure.persistence.models import MemberRow, SessionRow


async def test_self_registration_and_shared_directory(
    database: async_sessionmaker[AsyncSession],
) -> None:
    async with client() as first, client() as second:
        assert (await first.get("/members")).status_code == 401
        first_id = await register(first, "first")
        second_id = await register(second, "second")
        duplicate = await second.post("/auth/register", json=registration("FIRST"))
        assert duplicate.status_code == 409
        assert (await second.get("/auth/me")).json()["member"]["id"] == second_id
        profile = {"name": "小林", "contact": "家庭分机 102", "relationship": "姐姐"}
        assert (
            await second.put("/members/me", json={**profile, "id": first_id})
        ).status_code == 422
        assert (await second.put("/members/me", json=profile)).status_code == 200
        contacts = {"backup_phone": "010-12345678", "contact_email": "family@example.com"}
        assert (await second.put("/members/me", json={**profile, **contacts})).status_code == 200
        # A legacy client can still save the original fields.
        assert (await second.put("/members/me", json=profile)).status_code == 200
        rows = (await first.get("/members")).json()
        assert len(rows) == 2
        assert all("email" not in row and "password_hash" not in row for row in rows)
        assert next(row for row in rows if row["id"] == second_id)["contact"] == profile["contact"]
        relative = next(row for row in rows if row["id"] == second_id)
        assert all(relative[key] == value for key, value in contacts.items())
        cleared = await second.put("/members/me", json={**profile, "contact_email": None})
        assert cleared.json()["contact_email"] is None
        assert cleared.json()["backup_phone"] == contacts["backup_phone"]
        assert (await first.get("/auth/me")).json()["member"]["name"] == "first"
        async with database() as db:
            row = await db.get(MemberRow, first_id)
            assert row and row.password_hash.startswith("$argon2id$")
            assert await db.get(SessionRow, digest(first.cookies["homerp_session"]))


@pytest.mark.parametrize("confirmation", [None, "different-password"])
async def test_registration_requires_matching_passwords(
    database: async_sessionmaker[AsyncSession], confirmation: str | None
) -> None:
    async with client() as c:
        body = registration("confirm")
        body.pop("password_confirmation")
        if confirmation is not None:
            body["password_confirmation"] = confirmation
        response = await c.post("/auth/register", json=body)
        assert response.status_code == 422
        assert (await c.get("/auth/me")).status_code == 401
        await register(c, "confirm")


async def test_password_change_revokes_every_session(
    database: async_sessionmaker[AsyncSession],
) -> None:
    async with client() as first, client() as other_device:
        await register(first, "member")
        auth = credentials("member")
        assert (await other_device.post("/auth/login", json=auth)).status_code == 200
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
