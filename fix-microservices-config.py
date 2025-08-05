import os
import shutil
from pathlib import Path

# PostgreSQL + Redis defaults
DATABASE_URL_DEFAULT = "postgresql+asyncpg://postgres:postgres@localhost:5432/msmebazaar"
REDIS_URL_DEFAULT = "redis://localhost:6379"

# Services to skip
SKIP_SERVICES = {"auth-service", "notification-service"}

# New config template
CONFIG_TEMPLATE = f'''import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env

class Settings:
    # App
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Service")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "{DATABASE_URL_DEFAULT}")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "{REDIS_URL_DEFAULT}")

    # Security / Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "changeme")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

    # Twilio (Optional for notifications/SMS/WhatsApp)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", "")

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
'''

def update_microservice_configs(root_dir="microservices"):
    root_path = Path(root_dir)

    for service_dir in root_path.iterdir():
        if service_dir.is_dir() and service_dir.name not in SKIP_SERVICES:
            config_file = service_dir / "app" / "config.py"
            if config_file.exists():
                print(f"📌 Updating: {config_file}")
                
                # Backup original
                backup_file = config_file.with_suffix(".py.bak")
                shutil.copy(config_file, backup_file)

                # Write new config
                with open(config_file, "w") as f:
                    f.write(CONFIG_TEMPLATE.replace("Service", service_dir.name.replace("-", " ").title()))
            else:
                print(f"⚠️ No config.py found in {service_dir}")

if __name__ == "__main__":
    update_microservice_configs()
    print("✅ All configs updated to use PostgreSQL + Redis + JWT.")
