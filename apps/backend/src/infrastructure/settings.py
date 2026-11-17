from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: SecretStr = SecretStr(
        "mysql+asyncmy://dev_user:dev_password@localhost:3306/home_erp"
    )
    app_env: str = "development"
    app_debug: bool = True
    jwt_secret: SecretStr = SecretStr("change_me")


@lru_cache
def get_settings() -> Settings:
    return Settings()
