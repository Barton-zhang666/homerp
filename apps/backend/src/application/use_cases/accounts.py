import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Protocol
from uuid import uuid4

from src.domain.members.accounts import Account, Accounts, Member, Profile


class Passwords(Protocol):
    async def hash(self, password: str) -> str: ...
    async def verify(self, password: str, encoded: str | None) -> bool: ...


class InvalidCredentials(Exception):
    pass


class NoSession(Exception):
    pass


SESSION_DAYS = 7


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class AccountService:
    def __init__(self, repo: Accounts, passwords: Passwords):
        self.repo = repo
        self.passwords = passwords

    async def register(self, name: str, email: str, password: str) -> tuple[Account, str]:
        member = Member(str(uuid4()), Profile(name, "", None, "", ""))
        account = Account(member, email.casefold(), await self.passwords.hash(password))
        await self.repo.create(account)
        return account, await self.issue_session(member.id)

    async def issue_session(self, member_id: str) -> str:
        token = secrets.token_urlsafe(32)
        await self.repo.add_session(member_id, digest(token), now() + timedelta(days=SESSION_DAYS))
        return token

    async def login(self, email: str, password: str) -> tuple[Account, str]:
        account = await self.repo.by_email(email.casefold())
        valid = await self.passwords.verify(password, account.password_hash if account else None)
        if not valid or account is None:
            raise InvalidCredentials
        return account, await self.issue_session(account.member.id)

    async def current(self, token: str | None) -> Account:
        account = await self.repo.by_session(digest(token), now()) if token else None
        if not account:
            raise NoSession
        return account

    async def members(self, token: str | None) -> list[Member]:
        await self.current(token)
        return await self.repo.list_members()

    async def edit(self, token: str | None, profile: Profile) -> Member:
        account = await self.current(token)
        await self.repo.update_profile(account.member.id, profile)
        return Member(account.member.id, profile)

    async def logout(self, token: str | None) -> None:
        if token:
            await self.repo.revoke_session(digest(token))

    async def confirm(self, token: str | None, password: str) -> str:
        account = await self.current(token)
        if not await self.passwords.verify(password, account.password_hash):
            raise InvalidCredentials
        return account.member.id

    async def change_password(self, token: str | None, password: str, replacement: str) -> None:
        member_id = await self.confirm(token, password)
        await self.repo.set_password(member_id, await self.passwords.hash(replacement))
        await self.repo.revoke_all(member_id)
