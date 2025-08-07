from pydantic import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Auth Service"
    ENV: str = "development"
    DEBUG: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
