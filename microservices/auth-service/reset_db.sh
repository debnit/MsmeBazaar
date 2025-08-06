#!/usr/bin/env bash
set -e
DB=msmebazaar

echo "🛑 Dropping $DB..."
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB';"
sudo -u postgres dropdb --if-exists $DB

echo "📦 Creating $DB..."
sudo -u postgres createdb $DB

echo "🧹 Removing old migrations..."
rm -f microservices/auth-service/alembic/versions/*.py

echo "📜 Creating migration..."
cd microservices/auth-service
alembic revision --autogenerate -m "init schema"

echo "🚀 Applying migration..."
alembic upgrade head

echo "✅ Done!"
