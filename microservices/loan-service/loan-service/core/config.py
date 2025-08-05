import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "loan-service")
    DB_URL: str = os.getenv("DB_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/msmebazaar")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "changeme")

settings = Settings()
