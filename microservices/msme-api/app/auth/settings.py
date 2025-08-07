# libs/shared/auth/settings.py

from pydantic import BaseSettings

class AuthSettings(BaseSettings):
    SECRET_KEY: str = "your-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_prefix = "AUTH_"

def get_auth_settings() -> AuthSettings:
    return AuthSettings()
