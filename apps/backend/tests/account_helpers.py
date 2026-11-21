import httpx

from src.main import app


def client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url="http://test",
        transport=httpx.ASGITransport(app=app),
        headers={"X-Homerp-Request": "1"},
    )


def credentials(name: str) -> dict[str, str]:
    return {"email": f"{name}@example.com", "password": "test-password-123"}


def registration(name: str) -> dict[str, str]:
    auth = credentials(name)
    return {"name": name, **auth, "password_confirmation": auth["password"]}


async def register(c: httpx.AsyncClient, name: str) -> str:
    response = await c.post("/auth/register", json=registration(name))
    assert response.status_code == 201, response.text
    assert "HttpOnly" in response.headers["set-cookie"]
    return str(response.json()["member"]["id"])
