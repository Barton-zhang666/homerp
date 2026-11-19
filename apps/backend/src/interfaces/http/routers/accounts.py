from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response

from src.application.use_cases.accounts import SESSION_DAYS, AccountService
from src.domain.members.accounts import Account, Profile
from src.interfaces.dependencies import account_service
from src.interfaces.http.schemas.accounts import (
    Confirmation,
    Credentials,
    MemberView,
    PasswordChange,
    ProfileInput,
    Registration,
    SelfView,
)


def client_request(
    request: Request, x_homerp_request: Annotated[str | None, Header()] = None
) -> None:
    if request.method != "GET" and x_homerp_request != "1":
        raise HTTPException(403, "缺少应用请求标记")


router = APIRouter(tags=["用户与成员"], dependencies=[Depends(client_request)])
Service = Annotated[AccountService, Depends(account_service, scope="function")]
Token = Annotated[str | None, Cookie(alias="homerp_session")]


def signed_in(request: Request, response: Response, result: tuple[Account, str]) -> SelfView:
    account, token = result
    response.set_cookie(
        "homerp_session",
        token,
        max_age=SESSION_DAYS * 86400,
        httponly=True,
        samesite="strict",
        secure=request.url.scheme == "https",
    )
    return SelfView.of(account)


@router.post("/auth/register", status_code=201)
async def register(
    body: Registration, svc: Service, request: Request, response: Response
) -> SelfView:
    return signed_in(
        request,
        response,
        await svc.register(body.name, str(body.email), body.password.get_secret_value()),
    )


@router.post("/auth/login")
async def login(body: Credentials, svc: Service, request: Request, response: Response) -> SelfView:
    return signed_in(
        request, response, await svc.login(str(body.email), body.password.get_secret_value())
    )


@router.post("/auth/reactivate")
async def reactivate(
    body: Credentials, svc: Service, request: Request, response: Response
) -> SelfView:
    return signed_in(
        request,
        response,
        await svc.login(str(body.email), body.password.get_secret_value(), restore=True),
    )


@router.get("/auth/me")
async def me(svc: Service, token: Token = None) -> SelfView:
    return SelfView.of(await svc.current(token))


@router.get("/members")
async def members(svc: Service, token: Token = None) -> list[MemberView]:
    return [MemberView.of(m) for m in await svc.members(token)]


@router.put("/members/me")
async def update_profile(body: ProfileInput, svc: Service, token: Token = None) -> MemberView:
    profile = Profile(
        body.name, body.relationship, body.birthday, body.contact, body.emergency_contact
    )
    return MemberView.of(await svc.edit(token, profile))


@router.post("/auth/logout", status_code=204)
async def logout(svc: Service, response: Response, token: Token = None) -> None:
    await svc.logout(token)
    response.delete_cookie("homerp_session")


@router.post("/auth/deactivate", status_code=204)
async def deactivate(
    body: Confirmation, svc: Service, response: Response, token: Token = None
) -> None:
    await svc.deactivate(token, body.password.get_secret_value())
    response.delete_cookie("homerp_session")


@router.post("/auth/password", status_code=204)
async def password(
    body: PasswordChange, svc: Service, response: Response, token: Token = None
) -> None:
    await svc.change_password(
        token, body.password.get_secret_value(), body.new_password.get_secret_value()
    )
    response.delete_cookie("homerp_session")
