from fastapi import APIRouter
from fastapi.responses import JSONResponse
import socket
import time

router = APIRouter()

@router.get("/health")
async def health_check():
    return JSONResponse({
        "status": "ok",
        "service": "notification-service",
        "timestamp": time.time(),
        "hostname": socket.gethostname()
    })

@router.get("/readiness")
async def readiness_check():
    # In production, check DB/Redis/Kafka connections
    return {"ready": True}
