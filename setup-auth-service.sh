#!/bin/bash
set -e

echo "🚀 Setting up MSMEBazaar v2.0 Auth Service..."

# ====================================================
# 1. Remove old service & recreate folder structure
# ====================================================
AUTH_DIR="microservices/auth-service"
rm -rf $AUTH_DIR
mkdir -p $AUTH_DIR/app/{api/v1/routes,core,models,schemas,services,utils,tests}
touch $AUTH_DIR/app/{__init__.py}
touch $AUTH_DIR/app/api/{__init__.py}
touch $AUTH_DIR/app/api/v1/{__init__.py,deps.py}
touch $AUTH_DIR/app/api/v1/routes/{__init__.py,auth.py,users.py,health.py}
touch $AUTH_DIR/app/core/{__init__.py,security.py,otp.py,exceptions.py,config_loader.py,monitoring.py}
touch $AUTH_DIR/app/models/{__init__.py,user.py,session.py}
touch $AUTH_DIR/app/schemas/{__init__.py,auth.py,user.py,common.py}
touch $AUTH_DIR/app/services/{__init__.py,auth_service.py,otp_service.py,user_service.py}
touch $AUTH_DIR/app/utils/{__init__.py,redis.py,db.py,email.py,rate_limit.py}
touch $AUTH_DIR/app/tests/{__init__.py,test_auth.py,test_otp.py,test_user.py}
touch $AUTH_DIR/app/{main.py,config.py,dependencies.py,events.py,logging_config.py}

# ====================================================
# 2. Create config.py (flat Pydantic settings)
# ====================================================
cat > $AUTH_DIR/app/config.py <<'EOL'
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "MSMEBazaar Auth Service"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str
    REDIS_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_FROM_NUMBER: str

    PROMETHEUS_ENABLED: bool = True
    SENTRY_DSN: str | None = None

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
EOL

# ====================================================
# 3. main.py (FastAPI app)
# ====================================================
cat > $AUTH_DIR/app/main.py <<'EOL'
import uvicorn
from fastapi import FastAPI
from app.config import settings
from app.events import register_startup_shutdown
from app.api.v1.routes import auth, users, health
from app.logging_config import configure_logging
from prometheus_fastapi_instrumentator import Instrumentator

configure_logging()
app = FastAPI(title=settings.PROJECT_NAME, debug=settings.DEBUG)

register_startup_shutdown(app)

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])

if settings.PROMETHEUS_ENABLED:
    Instrumentator().instrument(app).expose(app)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
EOL

# ====================================================
# 4. health.py route
# ====================================================
cat > $AUTH_DIR/app/api/v1/routes/health.py <<'EOL'
from fastapi import APIRouter
import datetime

router = APIRouter()

@router.get("/")
async def health_check():
    return {
        "status": "ok",
        "service": "auth-service",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
EOL

# ====================================================
# 5. Minimal working JWT security.py
# ====================================================
cat > $AUTH_DIR/app/core/security.py <<'EOL'
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str):
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
EOL

# ====================================================
# 6. Dockerfile
# ====================================================
cat > $AUTH_DIR/Dockerfile <<'EOL'
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
EOL

# ====================================================
# 7. requirements.txt
# ====================================================
cat > $AUTH_DIR/requirements.txt <<'EOL'
fastapi==0.111.0
uvicorn[standard]==0.30.0
pydantic-settings==2.3.0
SQLAlchemy==2.0.31
psycopg2-binary==2.9.9
redis==5.0.4
passlib[argon2]==1.7.4
python-jose[cryptography]==3.3.0
twilio==9.2.3
tenacity==9.0.0
prometheus-fastapi-instrumentator==6.1.0
structlog==24.1.0
loguru==0.7.2
EOL

# ====================================================
# 8. requirements.dev.txt
# ====================================================
cat > $AUTH_DIR/requirements.dev.txt <<'EOL'
-r requirements.txt
pytest
pytest-asyncio
httpx
black
ruff
EOL

# ====================================================
# 9. Create .env.example
# ====================================================
cat > $AUTH_DIR/.env.example <<'EOL'
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/msmebazaar_auth
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=change_this_secret
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890
EOL

# ====================================================
# 10. Global Python venv
# ====================================================
VENV_DIR="$HOME/.venvs/msmebazaar"
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating global venv at $VENV_DIR..."
    mkdir -p "$HOME/.venvs"
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

# ====================================================
# 11. Install dependencies in venv
# ====================================================
pip install --upgrade pip
pip install -r $AUTH_DIR/requirements.txt
pip install -r $AUTH_DIR/requirements.dev.txt

echo "✅ Auth Service ready!"
echo "➡ Activate venv: source ~/.venvs/msmebazaar/bin/activate"
echo "➡ Run service: uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
EOL
