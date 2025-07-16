from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class MSME(BaseModel):
    id: str
    name: str
    phone: str
    state: str
    agreement_base64: str

# Dummy data — Replace with actual DB logic
@router.get("/admin/msmes", response_model=list[MSME])
async def get_msmes():
    return [
        {
            "id": "1",
            "name": "ABC Traders",
            "phone": "9999999999",
            "state": "Odisha",
            "agreement_base64": "JVBERi0xLjQKJ..."  # dummy base64
        },
        {
            "id": "2",
            "name": "XYZ Enterprises",
            "phone": "8888888888",
            "state": "Odisha",
            "agreement_base64": "JVBERi0xLjQKJ..."
        }
    ]
