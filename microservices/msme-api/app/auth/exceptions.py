# libs/shared/exceptions.py

from fastapi import HTTPException, status

def raise_unauthorized(detail: str = "Unauthorized"):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )
