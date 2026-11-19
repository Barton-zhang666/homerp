from datetime import datetime

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.members.accounts import Account, DuplicateEmail, Member, Profile
from src.infrastructure.persistence.models.account import MemberRow, SessionRow


def member(row: MemberRow) -> Member:
    return Member(
        row.id,
        Profile(
            name=row.name,
            relationship=row.relationship,
            birthday=row.birthday,
            contact=row.contact,
            emergency_contact=row.emergency_contact,
            backup_phone=row.backup_phone,
            contact_email=row.contact_email,
        ),
    )


def account(row: MemberRow | None) -> Account | None:
    return Account(member(row), row.email, row.password_hash) if row else None


class SqlAccounts:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, account: Account) -> None:
        self.db.add(
            MemberRow(
                id=account.member.id,
                email=account.email,
                password_hash=account.password_hash,
                name=account.member.profile.name,
                relationship="",
                contact="",
                emergency_contact="",
            )
        )
        try:
            await self.db.flush()
        except IntegrityError as exc:
            if "email" in str(exc.orig).lower():
                raise DuplicateEmail from exc
            raise

    async def by_email(self, email: str) -> Account | None:
        query = select(MemberRow).where(MemberRow.email == email).with_for_update()
        return account(await self.db.scalar(query))

    async def by_session(self, digest: str, now: datetime) -> Account | None:
        query = (
            select(MemberRow)
            .join(SessionRow)
            .where(SessionRow.digest == digest, SessionRow.expires_at > now)
            .with_for_update()
        )
        return account(await self.db.scalar(query))

    async def list_members(self) -> list[Member]:
        rows = await self.db.scalars(select(MemberRow).order_by(MemberRow.name, MemberRow.id))
        return [member(row) for row in rows]

    async def update_profile(self, member_id: str, profile: Profile) -> None:
        await self.db.execute(
            update(MemberRow)
            .where(MemberRow.id == member_id)
            .values(
                name=profile.name,
                relationship=profile.relationship,
                birthday=profile.birthday,
                contact=profile.contact,
                emergency_contact=profile.emergency_contact,
                backup_phone=profile.backup_phone,
                contact_email=profile.contact_email,
            )
        )

    async def set_password(self, member_id: str, password_hash: str) -> None:
        await self.db.execute(
            update(MemberRow).where(MemberRow.id == member_id).values(password_hash=password_hash)
        )

    async def add_session(self, member_id: str, digest: str, expiry: datetime) -> None:
        self.db.add(SessionRow(member_id=member_id, digest=digest, expires_at=expiry))

    async def revoke_session(self, digest: str) -> None:
        await self.db.execute(delete(SessionRow).where(SessionRow.digest == digest))

    async def revoke_all(self, member_id: str) -> None:
        await self.db.execute(delete(SessionRow).where(SessionRow.member_id == member_id))
