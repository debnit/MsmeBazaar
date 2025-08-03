from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_NAME: str = "notification-service"
    APP_PORT: int = 8005

    # Messaging
    AWS_SES_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str

    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    WHATSAPP_API_URL: str
    WHATSAPP_API_TOKEN: str

    FCM_SERVER_KEY: str

    # Redis / Kafka
    REDIS_URL: str
    KAFKA_BROKER_URL: str

    # Database
    DATABASE_URL: str

    # Monitoring
    SENTRY_DSN: str = ""
    PROMETHEUS_ENABLED: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
