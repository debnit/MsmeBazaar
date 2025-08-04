#!/bin/bash
set -e

SERVICE_NAME="gamification-service"
SERVICE_DIR="./microservices/$SERVICE_NAME"
VENV_DIR="./venv" # Global venv

echo "🚀 Setting up $SERVICE_NAME for local development..."

# Activate global venv
if [ ! -d "$VENV_DIR" ]; then
  echo "📦 Creating global virtual environment..."
  python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

# Install requirements
if [ -f "$SERVICE_DIR/requirements.txt" ]; then
  echo "📦 Installing service dependencies..."
  pip install -r "$SERVICE_DIR/requirements.txt"
fi

# Detect missing Python modules and auto-install
MISSING_MODULES=$(python - <<PY
import importlib.util
modules = ["redis", "prometheus_client"]
missing = [m for m in modules if importlib.util.find_spec(m) is None]
print(" ".join(missing))
PY
)

if [ ! -z "$MISSING_MODULES" ]; then
  echo "📦 Installing missing modules: $MISSING_MODULES"
  pip install $MISSING_MODULES
fi

# Load environment variables
if [ -f "./.env.local" ]; then
  echo "🔍 Loading environment variables from .env.local..."
  export $(grep -v '^#' .env.local | xargs)
elif [ -f "./.env.example" ]; then
  echo "🔍 Loading environment variables from .env.example..."
  export $(grep -v '^#' .env.example | xargs)
fi

# Test PostgreSQL connection
echo "🔍 Testing PostgreSQL connection..."
python - <<PY
import os, psycopg2
try:
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    print(f"✅ PostgreSQL connection OK: {os.getenv('DATABASE_URL')}")
    conn.close()
except Exception as e:
    print(f"❌ PostgreSQL connection failed: {e}")
PY

    # Test Redis connection
echo "🔍 Testing Redis connection..."
python - <<PY
import os, redis
try:
    r = redis.from_url(os.getenv("REDIS_URL"))
    r.ping()
    print(f"✅ Redis connection OK: {os.getenv('REDIS_URL')}")
except Exception as e:
    print(f"❌ Redis connection failed: {e}")
PY

# Start service
echo "▶ Starting $SERVICE_NAME on port 8010..."
uvicorn app:app \
    --reload \
    --host 0.0.0.0 \
    --port 8010 \
    --app-dir microservices/gamification-service

