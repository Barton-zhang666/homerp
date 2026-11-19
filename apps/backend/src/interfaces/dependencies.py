from collections.abc import AsyncIterator

from fastapi import HTTPException

from src.application.use_cases.accounts import (
    AccountService,
    InvalidCredentials,
    NoSession,
)
from src.application.use_cases.health import CheckHealth
from src.domain.members.accounts import DuplicateEmail
from src.infrastructure.external.passwords import get_passwords
from src.infrastructure.persistence.database import get_session_factory
from src.infrastructure.persistence.repositories.accounts import SqlAccounts


def get_check_health() -> CheckHealth:
    return CheckHealth()


async def account_service() -> AsyncIterator[AccountService]:
    try:
        async with get_session_factory().begin() as db:
            yield AccountService(SqlAccounts(db), get_passwords())
    except DuplicateEmail as exc:
        raise HTTPException(409, "该邮箱已注册") from exc
    except InvalidCredentials as exc:
        raise HTTPException(403, "邮箱或密码不正确") from exc
    except NoSession as exc:
        raise HTTPException(401, "请重新登录") from exc
