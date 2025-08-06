from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "MSMEBazaar Auth Service"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str="postgresql+asyncpg://postgres:postgres@localhost:5432/msmebazaar"
    REDIS_URL: str="redis://localhost:6379"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_FROM_NUMBER: str

    PROMETHEUS_ENABLED: bool = True
    SENTRY_DSN: str | None = None

    class Config:
        env_file = ".env.example"
        case_sensitive = True

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
