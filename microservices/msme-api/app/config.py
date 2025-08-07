# libs/shared/config.py
from pydantic import BaseSettings, AnyHttpUrl, EmailStr, PostgresDsn, RedisDsn
from typing import Optional
import os

class Settings(BaseSettings):
    # General
    ENV: str = "development"
    DEBUG: bool = False
    PROJECT_NAME: str = "MsmeBazaar"

    # Database
    DATABASE_URL: PostgresDsn
    REDIS_URL: RedisDsn

    # Security
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Twilio
    TWILIO_ACCOUNT_SID: Optional[str]
    TWILIO_AUTH_TOKEN: Optional[str]
    TWILIO_PHONE_NUMBER: Optional[str]

    # External APIs
    OPENAI_API_KEY: Optional[str]
    RAZORPAY_KEY_ID: Optional[str]
    RAZORPAY_KEY_SECRET: Optional[str]
    WEAVIATE_URL: Optional[AnyHttpUrl]
    DOCUSIGN_INTEGRATION_KEY: Optional[str]

    # Monitoring & Logging
    SENTRY_DSN: Optional[AnyHttpUrl]
    PROMETHEUS_PUSHGATEWAY_URL: Optional[str]

    # Email
    SMTP_HOST: Optional[str]
    SMTP_PORT: Optional[int]
    SMTP_USER: Optional[str]
    SMTP_PASSWORD: Optional[str]
    EMAILS_FROM_EMAIL: Optional[EmailStr]

    # CORS
    BACKEND_CORS_ORIGINS: Optional[str] = "*"

    # File Storage
    AWS_ACCESS_KEY_ID: Optional[str]
    AWS_SECRET_ACCESS_KEY: Optional[str]
    AWS_S3_BUCKET_NAME: Optional[str]
    AWS_S3_REGION: Optional[str]

    # Service URLs (API Gateway or Inter-Service)
    AUTH_SERVICE_URL: Optional[AnyHttpUrl] = "http://localhost:8000"
    MSME_SERVICE_URL: Optional[AnyHttpUrl] = "http://localhost:8002"
    VALUATION_SERVICE_URL: Optional[AnyHttpUrl] = "http://localhost:8003"
    MATCHMAKING_SERVICE_URL: Optional[AnyHttpUrl] = "http://localhost:8004"

    class Config:
        env_file = os.getenv("ENV_PATH", ".env")
        case_sensitive = True

settings = Settings()
def get_settings() -> Settings:
    return settings
