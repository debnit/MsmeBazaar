#!/usr/bin/env python3
import os
import shutil
from pathlib import Path

# Root for auth-service
ROOT = Path("./microservices/auth-service/app")

# File templates
FILES = {
    "utils/db.py": """\
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/msmebazaar")

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
""",

    "models/user.py": """\
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
import enum
from app.utils.db import Base

class RoleEnum(str, enum.Enum):
    MSME = "MSME"
    BUYER = "BUYER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.MSME)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
""",

    "models/session.py": """\
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.utils.db import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
""",

    "services/user_service.py": """\
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.core.security import hash_password
from uuid import uuid4

async def create_user(db: AsyncSession, payload: UserCreate) -> UserRead:
    db_user = User(
        id=str(uuid4()),
        phone=payload.phone,
        email=payload.email,
        name=payload.full_name,
        role=payload.role,
        is_verified=False,
        is_active=True,
        hashed_password=hash_password(payload.password)
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return UserRead.model_validate(db_user)

async def get_user_by_phone(db: AsyncSession, phone: str) -> User | None:
    result = await db.execute(select(User).where(User.phone == phone))
    return result.scalar_one_or_none()
""",

    "api/v1/deps.py": """\
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.db import get_db

async def get_db_session() -> AsyncSession:
    async for session in get_db():
        yield session
"""
}

def backup_and_write(file_path: Path, content: str):
    """Backup existing file and write new content."""
    if file_path.exists():
        backup_path = file_path.with_suffix(file_path.suffix + ".bak")
        shutil.copy(file_path, backup_path)
        print(f"📦 Backed up {file_path} → {backup_path}")
    else:
        os.makedirs(file_path.parent, exist_ok=True)
    file_path.write_text(content.strip() + "\n", encoding="utf-8")
    print(f"✅ Updated {file_path}")

def main():
    for rel_path, content in FILES.items():
        abs_path = ROOT / rel_path
        backup_and_write(abs_path, content)

    print("\n🚀 Auth service async SQLAlchemy scaffolding completed!")
    print("➡️ Next steps:")
    print("1. Install dependencies: pip install fastapi uvicorn[standard] asyncpg sqlalchemy alembic passlib[bcrypt] python-jose[cryptography] redis aioredis")
    print("2. Initialize Alembic: alembic init alembic")
    print("3. Autogenerate migrations: alembic revision --autogenerate -m 'init schema'")
    print("4. Apply migrations: alembic upgrade head")
    print("5. Start service: uvicorn app.main:app --reload --port 8000")

if __name__ == "__main__":
    main()
