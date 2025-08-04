#!/usr/bin/env bash
set -e

SERVICE_NAME="auth-service"
SERVICE_DIR="./microservices/auth-service"
SERVICE_PORT=8001
REQ_FILE="$SERVICE_DIR/requirements.txt"

GLOBAL_VENV="./venv"

echo "🚀 Setting up $SERVICE_NAME for local development..."

# 1️⃣ Kill any process using target port
EXISTING_PID=$(lsof -ti tcp:$SERVICE_PORT || true)
if [ -n "$EXISTING_PID" ]; then
    echo "⚠ Port $SERVICE_PORT in use by PID(s): $EXISTING_PID"
    echo "🔪 Killing process..."
    kill -9 $EXISTING_PID
    echo "✅ Freed port $SERVICE_PORT"
fi

# 2️⃣ Ensure global venv exists & activate
if [ ! -d "$GLOBAL_VENV" ]; then
    echo "📦 Creating global virtual environment..."
    python3 -m venv "$GLOBAL_VENV"
fi
source "$GLOBAL_VENV/bin/activate"

# 3️⃣ Create requirements.txt if missing
if [ ! -f "$REQ_FILE" ]; then
    echo "📝 Creating $REQ_FILE..."
    touch "$REQ_FILE"
fi

# 4️⃣ Auto-detect missing dependencies from codebase
echo "🔍 Scanning Python files for imports..."
MISSING_MODULES=$(python - <<PY
import os, re, importlib, sys

# Known mapping from import name to PyPI package
PACKAGE_MAP = {
    "pydantic_settings": "pydantic-settings",
    "jose": "python-jose",
    "jwt": "PyJWT",
    "bcrypt": "bcrypt",
    "sentry_sdk": "sentry-sdk",
    "twilio": "twilio",
}

# Project root packages (to skip)
LOCAL_MODULES = {
    "main", "models", "services", "middlewares", "utils", "security", "config", "database"
}

scan_dir = "$SERVICE_DIR"
import_re = re.compile(r'^\s*(?:import|from)\s+([a-zA-Z0-9_\.]+)')
found_modules = set()

for root, _, files in os.walk(scan_dir):
    for f in files:
        if f.endswith(".py"):
            try:
                with open(os.path.join(root, f), "r", encoding="utf-8") as fh:
                    for line in fh:
                        match = import_re.match(line)
                        if match:
                            mod = match.group(1).split('.')[0]
                            found_modules.add(mod)
            except:
                pass

builtin = sys.builtin_module_names
missing = []
for mod in sorted(found_modules):
    if mod in builtin or mod in LOCAL_MODULES:
        continue
    try:
        importlib.import_module(mod)
    except ImportError:
        missing.append(PACKAGE_MAP.get(mod, mod))

print(" ".join(missing))
PY
)

# 6️⃣ Install dependencies from requirements.txt
if [ -s "$REQ_FILE" ]; then
    echo "📦 Installing dependencies from $REQ_FILE..."
    pip install -r "$REQ_FILE"
fi

# 7️⃣ Load environment variables
if [ -f ".env.local" ]; then
    echo "🔍 Loading env from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
elif [ -f ".env.example" ]; then
    echo "🔍 Loading env from .env.example..."
    export $(grep -v '^#' .env.example | xargs)
fi

# 8️⃣ Test PostgreSQL connection (optional)
if [ -n "$DATABASE_URL" ]; then
    echo "🔍 Testing PostgreSQL connection..."
    python - <<PY
import os, psycopg2
try:
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    conn.close()
    print("✅ PostgreSQL connection OK:", os.getenv("DATABASE_URL"))
except Exception as e:
    print("❌ PostgreSQL connection failed:", e)
PY
fi

# 9️⃣ Start local server
echo "▶ Starting $SERVICE_NAME on port $SERVICE_PORT..."
uvicorn main:app --reload --app-dir "$SERVICE_DIR" --port $SERVICE_PORT
