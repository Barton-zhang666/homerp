from dataclasses import dataclass
from datetime import date, datetime
from typing import Protocol


@dataclass(frozen=True)
class Profile:
    name: str
    relationship: str
    birthday: date | None
    contact: str
    emergency_contact: str


@dataclass(frozen=True)
class Member:
    id: str
    profile: Profile


@dataclass(frozen=True)
class Account:
    member: Member
    email: str
    password_hash: str


class Accounts(Protocol):
    async def create(self, account: Account) -> None: ...
    async def by_email(self, email: str) -> Account | None: ...
    async def by_session(self, digest: str, now: datetime) -> Account | None: ...
    async def list_members(self) -> list[Member]: ...
    async def update_profile(self, member_id: str, profile: Profile) -> None: ...
    async def set_password(self, member_id: str, password_hash: str) -> None: ...
    async def add_session(self, member_id: str, digest: str, expiry: datetime) -> None: ...
    async def revoke_session(self, digest: str) -> None: ...
    async def revoke_all(self, member_id: str) -> None: ...


class DuplicateEmail(Exception):
    pass
