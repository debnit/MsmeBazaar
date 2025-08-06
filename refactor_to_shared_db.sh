#!/usr/bin/env bash
set -e

echo "📦 Creating shared DB libs..."
mkdir -p libs/db/models
touch libs/db/{__init__.py,base.py,session.py}
touch libs/db/models/{__init__.py,user.py}

echo "🚀 Moving auth models to shared location..."
mv microservices/auth-service/app/models/user.py libs/db/models/user.py || true

echo "🧹 Removing local Alembic from auth-service..."
rm -rf microservices/auth-service/alembic microservices/auth-service/alembic.ini || true

echo "🔄 Initializing Alembic in libs/db..."
cd libs/db
if [ ! -d "alembic" ]; then
    alembic init alembic
fi

echo "⚙️ Updating Alembic config..."
sed -i 's#sqlalchemy.url.*#sqlalchemy.url = postgresql+asyncpg://postgres:postgres@localhost:5432/msmebazaar#' alembic.ini

echo "📜 Generating migration..."
alembic revision --autogenerate -m "init full schema"

echo "📈 Applying migration..."
alembic upgrade head

echo "✅ Shared DB refactor complete!"
