from typing import Annotated

from fastapi import APIRouter, Depends

from src.application.use_cases.health import CheckHealth
from src.interfaces.dependencies import get_check_health
from src.interfaces.http.schemas.health import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse, operation_id="get_health")
async def health(check: Annotated[CheckHealth, Depends(get_check_health)]) -> HealthResponse:
    result = check.execute()
    return HealthResponse(status=result.status)
