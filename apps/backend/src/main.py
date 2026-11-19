from fastapi import FastAPI

from src.infrastructure.settings import get_settings
from src.interfaces.http.routers.accounts import router as accounts_router
from src.interfaces.http.routers.health import router as health_router

settings = get_settings()
app = FastAPI(title="homerp API", version="0.1.0", debug=settings.app_debug)
app.include_router(health_router)
app.include_router(accounts_router)
