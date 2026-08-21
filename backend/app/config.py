from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./crm_dev.db"
    DATABASE_URL_PROD: str = "postgresql+asyncpg://user:pass@localhost:5432/corecrm"
    SECRET_KEY: str  # Required from environment - no default for security
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    GROQ_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    RESEND_API_KEY: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    # SLA & scheduling configuration
    SLA_WINDOW_HOURS: int = 24
    SLA_CHECK_INTERVAL_MINUTES: int = 5
    SQLITE_URL: str = "sqlite+aiosqlite:///./crm_dev.db"
    USE_SQLITE: bool = True

    @property
    def active_db_url(self) -> str:
        return self.SQLITE_URL if self.USE_SQLITE else self.DATABASE_URL

    @property
    def database_url(self) -> str:
        return self.active_db_url

    @property
    def frontend_url(self) -> str:
        return self.FRONTEND_URL

    @property
    def environment(self) -> str:
        return self.ENVIRONMENT

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
