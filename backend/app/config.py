from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/crm_db"
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ENVIRONMENT: str = "development"
    SQLITE_URL: str = "sqlite+aiosqlite:///./crm_dev.db"
    USE_SQLITE: bool = True
    GROQ_API_KEY: Optional[str] = None

    @property
    def active_db_url(self) -> str:
        return self.SQLITE_URL if self.USE_SQLITE else self.DATABASE_URL

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
