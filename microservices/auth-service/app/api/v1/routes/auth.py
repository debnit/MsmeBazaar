from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import LoginRequest, LoginResponse
from app.services.auth_service import authenticate_user, create_jwt_for_user

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    user = await authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_jwt_for_user(user)
    return LoginResponse(access_token=token, token_type="bearer")

@router.get("/me")
async def read_current_user():
    return {"message": "Current user details will go here"}
