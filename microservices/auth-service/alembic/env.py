import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

from app.models import Base  # Your SQLAlchemy models Base
from app.config import settings  # Your settings with DATABASE_URL

# Load Alembic config
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use models' metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode with async engine."""
    connectable = create_async_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
    )

    async with connectable.begin() as conn:
        # ✅ Ensure tables exist for a fresh DB
        await conn.run_sync(Base.metadata.create_all)

        # ✅ Configure Alembic to use this connection
        await conn.run_sync(
            lambda sync_conn: context.configure(
                connection=sync_conn,
                target_metadata=target_metadata,
                compare_type=True,  # Detect column type changes
                compare_server_default=True
            )
        )

        # ✅ Run migrations
        await conn.run_sync(lambda sync_conn: context.run_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
