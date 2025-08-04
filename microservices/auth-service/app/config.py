# app/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field
import os
import sys


class Settings(BaseSettings):
    # Core
    ENV: str = Field(default="development", description="Environment name")
    DEBUG: bool = Field(default=False, description="Enable debug mode")

    # Database
    DATABASE_URL: str = Field(..., description="PostgreSQL connection string")

    # Redis
    REDIS_URL: str = Field(..., description="Redis connection string")

    # Auth / Security
    JWT_SECRET: str = Field(..., description="JWT secret key")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    JWT_EXPIRATION_SECONDS: int = Field(default=3600, description="JWT expiration in seconds")

    # Twilio (for OTP)
    TWILIO_ACCOUNT_SID: str = Field(..., description="Twilio account SID")
    TWILIO_AUTH_TOKEN: str = Field(..., description="Twilio auth token")
    TWILIO_FROM_NUMBER: str = Field(..., description="Twilio sender number")

    # Monitoring & Logging
    SENTRY_DSN: str | None = Field(default=None, description="Sentry DSN for error tracking")
    PROMETHEUS_ENABLED: bool = Field(default=True, description="Enable Prometheus metrics")

    # Application
    PROJECT_NAME: str = Field(default="Auth Service", description="Name of the service")
    API_V1_PREFIX: str = Field(default="/api/v1", description="API version prefix")

    model_config = {
        # Use .env for real values in dev/local
        "env_file": os.path.join(os.path.dirname(__file__), "..", ".env.example"),
        "env_file_encoding": "utf-8",
        "case_sensitive": True
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings object."""
    try:
        return Settings()
    except Exception as e:
        print(f"❌ Failed to load settings: {e}", file=sys.stderr)
        raise


settings = get_settings()
