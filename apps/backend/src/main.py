from fastapi import FastAPI

from src.infrastructure.settings import get_settings
from src.interfaces.http.routers.health import router as health_router

settings = get_settings()
app = FastAPI(title="homeerp API", version="0.1.0", debug=settings.app_debug)
app.include_router(health_router)
