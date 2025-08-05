from app.core.security import verify_password, create_access_token
from datetime import timedelta

# This is placeholder logic, you should integrate with your DB user model
async def authenticate_user(username: str, password: str):
    # Replace this with DB lookup
    fake_user = {"username": "admin", "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$..."}
    if username != fake_user["username"]:
        return None
    if not verify_password(password, fake_user["hashed_password"]):
        return None
    return fake_user

def create_jwt_for_user(user: dict) -> str:
    access_token_expires = timedelta(minutes=30)
    return create_access_token({"sub": user["username"]}, expires_delta=access_token_expires)
