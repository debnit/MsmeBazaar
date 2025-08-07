from fastapi import APIRouter, Depends
from app.services.msme_service import get_msme_data

router = APIRouter()

@router.get("/msme")
async def read_msme():
    return await get_msme_data()
