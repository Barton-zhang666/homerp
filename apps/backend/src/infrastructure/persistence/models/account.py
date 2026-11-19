from datetime import date, datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.persistence.models.base import Base


class MemberRow(Base):
    __tablename__ = "members"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(64))
    relationship: Mapped[str] = mapped_column(String(64))
    birthday: Mapped[date | None]
    contact: Mapped[str] = mapped_column(String(160))
    emergency_contact: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))


class SessionRow(Base):
    __tablename__ = "member_sessions"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id"), index=True)
    expires_at: Mapped[datetime]
