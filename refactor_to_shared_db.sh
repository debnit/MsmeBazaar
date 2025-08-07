#!/usr/bin/env bash
set -e

echo "🚀 Setting up central DB & Alembic..."

# Create folders
mkdir -p libs/db/models libs/db/alembic/versions
touch libs/db/__init__.py libs/db/models/__init__.py

# Create base.py
echo "✅ Creating base.py"
cat > libs/db/base.py <<'EOF'
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()
EOF

# Create session.py
echo "✅ Creating session.py"
cat > libs/db/session.py <<'EOF'
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/msmebazaar")
engine = create_engine(DATABASE_URL, future=True, echo=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOF

# Move auth models (including .bak if needed)
echo "📦 Moving models from auth-service"
mkdir -p libs/db/models
cp microservices/auth-service/app/models/*.py* libs/db/models/ || true

# Init Alembic if not already
if [ ! -d "libs/db/alembic" ]; then
    alembic init libs/db/alembic
fi

# Write custom env.py
ENV_PATH="libs/db/alembic/env.py"
echo "⚙️ Writing env.py at $ENV_PATH"
cat > "$ENV_PATH" <<'EOF'
import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
sys.path.append(BASE_DIR)

from libs.db.base import Base
from libs.db import models

config = context.config
fileConfig(config.config_file_name)

url = os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url"))
config.set_main_option("sqlalchemy.url", url)

target_metadata = Base.metadata

def run_migrations_offline():
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
EOF

echo "✅ All set. Now run:"
echo "cd libs/db"
echo "alembic revision --autogenerate -m \"init shared schema\""
echo "alembic upgrade head"
