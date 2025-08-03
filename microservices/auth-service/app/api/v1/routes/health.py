from fastapi import APIRouter
import datetime

router = APIRouter()

@router.get("/")
async def health_check():
    return {
        "status": "ok",
        "service": "auth-service",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
