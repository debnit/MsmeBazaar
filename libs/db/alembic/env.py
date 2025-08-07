# config.py
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import PostgresDsn, RedisDsn, Field


class Settings(BaseSettings):
    # General
    ENV: str = "development"
    DEBUG: bool = True
    PROJECT_NAME: str = "MSMEBazaar"
    API_PREFIX: str = "/api"

    # Database
    DATABASE_URL: PostgresDsn
    REDIS_URL: RedisDsn

    # Security
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Twilio / OTP
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    # External APIs
    OPENAI_API_KEY: str | None = None
    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None

    # Optional / Features
    SENTRY_DSN: str | None = None
    ENABLE_PROMETHEUS: bool = False
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
