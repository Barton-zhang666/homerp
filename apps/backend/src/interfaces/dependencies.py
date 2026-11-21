from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Cookie, HTTPException

from src.application.use_cases.accounts import (
    AccountService,
    InvalidCredentials,
    NoSession,
)
from src.application.use_cases.health import CheckHealth
from src.application.use_cases.inventory import MissingStock, NotStockOwner, StockService
from src.domain.inventory.stock import StockError
from src.domain.members.accounts import DuplicateEmail
from src.infrastructure.external.passwords import get_passwords
from src.infrastructure.persistence.database import get_session_factory
from src.infrastructure.persistence.repositories.accounts import SqlAccounts
from src.infrastructure.persistence.repositories.inventory import SqlInventory


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


async def inventory_service(
    token: Annotated[str | None, Cookie(alias="homerp_session")] = None,
) -> AsyncIterator[StockService]:
    try:
        async with get_session_factory().begin() as db:
            current = await AccountService(SqlAccounts(db), get_passwords()).current(token)
            yield StockService(SqlInventory(db), current.member.id)
    except NoSession as exc:
        raise HTTPException(401, "请重新登录") from exc
    except MissingStock as exc:
        raise HTTPException(404, "品目不存在") from exc
    except NotStockOwner as exc:
        raise HTTPException(403, "只能修改或撤回本人的记录") from exc
    except StockError as exc:
        raise HTTPException(409, str(exc)) from exc
