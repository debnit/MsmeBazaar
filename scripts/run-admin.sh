#!/usr/bin/env bash
set -e

echo "========================================="
echo "🚀 MSMEBazaar Admin SaaS - Local Startup (WSL2)"
echo "========================================="

ADMIN_API_DIR="microservices/admin-service"
ADMIN_WEB_DIR="apps/admin"
API_PORT=8005
WEB_PORT=3001

# --- 1. Load environment variables ---
set -a
if [ -f "./.env.local" ]; then
  export $(grep -v '^#' .env.local | tr -d '\r' | sed 's/"//g')
  echo "✅ Loaded environment variables from .env.local"
elif [ -f "./.env.example" ]; then
  export $(grep -v '^#' .env.example | tr -d '\r' | sed 's/"//g')
  echo "⚠️ Loaded environment variables from .env.example (default)"
else
  echo "❌ No .env.local or .env.example found."
  exit 1
fi
set +a

# --- 2. Ensure DATABASE_URL is set ---
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set."
  exit 1
else
  echo "📦 Using DATABASE_URL=$DATABASE_URL"
fi

# --- 3. If local DB → start Postgres service ---
if echo "$DATABASE_URL" | grep -Eq "localhost|127\.0\.0\.1"; then
  echo "🗄 Detected local Postgres — starting WSL2 Postgres..."
  if ! sudo service postgresql status >/dev/null 2>&1; then
    sudo service postgresql start
    echo "✅ Postgres service started"
  else
    echo "✅ Postgres is already running"
  fi

  # --- 4. Create DB if missing ---
  DB_NAME=$(echo "$DATABASE_URL" | sed -E 's#.*/##')
  if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "📦 Creating database '$DB_NAME'..."
    sudo -u postgres createdb "$DB_NAME"
    echo "✅ Database '$DB_NAME' created"
  else
    echo "✅ Database '$DB_NAME' already exists"
  fi
else
  echo "🌐 Remote DB detected — skipping local Postgres start"
fi

# --- 5. Ensure PostgreSQL client tools installed ---
if ! command -v pg_config &>/dev/null; then
  echo "📦 Installing PostgreSQL client libraries..."
  sudo apt update
  sudo apt install -y libpq-dev python3-dev build-essential
fi

# --- 6. Push Prisma schema ---
echo "🚀 Pushing Prisma schema to DB..."
pnpm --filter @msmebazaar/db run db:push

# --- 7. Start Admin API ---
if [ -d "$ADMIN_API_DIR" ]; then
  echo "📦 Starting Admin API..."
  (
    cd "$ADMIN_API_DIR"
    if [ ! -d ".venv" ]; then
      echo "🐍 Creating Python virtualenv..."
      python3 -m venv .venv
    fi

    source .venv/bin/activate

    echo "📦 Installing Python dependencies..."
    pip install --upgrade pip setuptools wheel
    pip install -r requirements.txt

    echo "✅ Python dependencies installed."
    uvicorn main:app --reload --host 0.0.0.0 --port $API_PORT &
    echo "✅ Admin API running on http://localhost:$API_PORT"
  )
else
  echo "❌ Admin API not found at $ADMIN_API_DIR"
fi

# --- 8. Start Admin Dashboard ---
if [ -d "$ADMIN_WEB_DIR" ]; then
  echo "💻 Starting Admin Dashboard..."
  (
    cd "$ADMIN_WEB_DIR"
    pnpm install
    pnpm dev --port $WEB_PORT
  )
else
  echo "❌ Admin Dashboard not found at $ADMIN_WEB_DIR"
fi
