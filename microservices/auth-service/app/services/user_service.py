from app.schemas.user import UserCreate, UserRead
from app.core.security import hash_password
from typing import Optional

# Fake in-memory DB for now
fake_users_db = []

async def create_user(payload: UserCreate) -> Optional[UserRead]:
    user_id = len(fake_users_db) + 1
    hashed_pw = hash_password(payload.password)
    new_user = {
        "id": user_id,
        "email": payload.email,
        "full_name": payload.full_name,
        "hashed_password": hashed_pw
    }
    fake_users_db.append(new_user)
    return UserRead(id=user_id, email=payload.email, full_name=payload.full_name)

async def get_user_by_id(user_id: int) -> Optional[UserRead]:
    for user in fake_users_db:
        if user["id"] == user_id:
            return UserRead(id=user["id"], email=user["email"], full_name=user.get("full_name"))
    return None
