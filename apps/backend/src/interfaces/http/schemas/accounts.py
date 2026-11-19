from datetime import date
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, StringConstraints

from src.domain.members.accounts import Account, Member

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
Password = Annotated[SecretStr, Field(min_length=10, max_length=128)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Credentials(Input):
    email: EmailStr = Field(max_length=254)
    password: SecretStr = Field(min_length=1, max_length=128)


class Registration(Credentials):
    name: Name
    password: Password
    password_confirmation: SecretStr


class ProfileInput(Input):
    name: Name
    relationship: str = Field(default="", max_length=64)
    birthday: date | None = None
    contact: str = Field(default="", max_length=160)
    emergency_contact: str = Field(default="", max_length=160)


class PasswordChange(Input):
    password: SecretStr = Field(min_length=1, max_length=128)
    new_password: Password


class MemberView(ProfileInput):
    id: str

    @classmethod
    def of(cls, member: Member) -> Self:
        p = member.profile
        return cls(
            id=member.id,
            name=p.name,
            relationship=p.relationship,
            birthday=p.birthday,
            contact=p.contact,
            emergency_contact=p.emergency_contact,
        )


class SelfView(BaseModel):
    email: str
    member: MemberView

    @classmethod
    def of(cls, account: Account) -> Self:
        return cls(email=account.email, member=MemberView.of(account.member))
