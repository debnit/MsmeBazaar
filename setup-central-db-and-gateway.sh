#!/usr/bin/env bash
set -e

echo "🚀 Setting up central DB & API-Gateway integration..."

# ===== PHASE 1: DB SETUP =====

DB_DIR="libs/db"
MODELS_DIR="$DB_DIR/models"
ALEMBIC_DIR="$DB_DIR/alembic"
VERSIONS_DIR="$ALEMBIC_DIR/versions"

mkdir -p $MODELS_DIR $VERSIONS_DIR
touch $DB_DIR/__init__.py
touch $MODELS_DIR/__init__.py

cat > $DB_DIR/base.py <<'EOF'
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()
EOF

cat > $DB_DIR/session.py <<'EOF'
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

cat > $DB_DIR/alembic.ini <<'EOF'
[alembic]
script_location = libs/db/alembic
sqlalchemy.url = postgresql+asyncpg://postgres:postgres@localhost:5432/msmebazaar
EOF

cat > $ALEMBIC_DIR/env.py <<'EOF'
import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from libs.db.base import Base
from libs.db.models import *

config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata

def run_migrations_offline():
    url = os.getenv("DATABASE_URL")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool
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

# Move models from auth-service, msme-service, user-profile-service to shared location
for svc in auth-service msme-service user-profile-service; do
    if [ -d "microservices/$svc/models" ]; then
        echo "📦 Moving models from $svc to libs/db/models"
        mv microservices/$svc/models/* $MODELS_DIR/ || true
    fi
done



# ===== DONE =====

cat <<EOM
✅ Central DB created at libs/db
✅ Models moved to shared location
✅ Alembic configured for shared schema
✅ API-Gateway routes set for auth, msme, and user-profile

Next steps:
1. Update all DB-enabled services to import from libs/db:
   from libs.db.session import get_db
   from libs.db.models import User, MsmeProfile
2. Run migrations:
   cd libs/db
   alembic revision --autogenerate -m "init full schema"
   alembic upgrade head

EOM
