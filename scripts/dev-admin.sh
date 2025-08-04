#!/bin/bash
set -a  # automatically export all variables

# Load .env.local first, fallback to .env.example
if [ -f ".env.local" ]; then
  export $(cat ./.env.local | tr -d '\r' | grep -v '^#' | sed 's/"//g')
  echo "✅ Loaded environment variables from .env.local"
elif [ -f ".env.example" ]; then
  export $(cat ./.env.example | tr -d '\r' | grep -v '^#' | sed 's/"//g')
  echo "⚠️ Loaded environment variables from .env.example (default)"
else
  echo "❌ No .env.local or .env.example found"
  exit 1
fi

set +a

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set."
  exit 1
else
  echo "📦 Using DATABASE_URL=$DATABASE_URL"
fi

# Detect if DATABASE_URL is localhost
if echo "$DATABASE_URL" | grep -Eq "localhost|127\.0\.0\.1"; then
  echo "🗄 Detected local Postgres — starting WSL2 Postgres service..."
  sudo service postgresql status > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    sudo service postgresql start
    if [ $? -eq 0 ]; then
      echo "✅ Postgres service started"
    else
      echo "❌ Failed to start Postgres service"
      exit 1
    fi
  else
    echo "✅ Postgres is already running"
  fi
else
  echo "🌐 Remote DB detected — skipping local Postgres start"
fi

# Push Prisma schema
echo "🚀 Pushing Prisma schema..."
pnpm --filter @msmebazaar/db run db:push
if [ $? -ne 0 ]; then
  echo "❌ Prisma db push failed"
  exit 1
fi

# Start Admin Service
echo "🖥 Starting Admin Service..."
cd microservices/admin-service
source .venv/bin/activate
uvicorn main:app --reload
