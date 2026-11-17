import httpx

from src.main import app


async def test_health_works_without_database() -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_docs_and_openapi_expose_health_contract() -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        docs = await client.get("/docs")
        response = await client.get("/openapi.json")

    assert docs.status_code == 200
    assert "SwaggerUIBundle" in docs.text
    assert response.status_code == 200
    schema = response.json()
    health = schema["paths"]["/health"]["get"]
    assert health["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/HealthResponse"
    }
    assert (
        schema["components"]["schemas"]["HealthResponse"]["properties"]["status"]["const"] == "ok"
    )
