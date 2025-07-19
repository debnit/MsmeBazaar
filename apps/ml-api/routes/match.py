
from fastapi import APIRouter

router = APIRouter()

@router.get("/buyer/{id}")
def match_buyer(id: int):
    return {"buyer_id": id, "matches": []}

@router.get("/msme/{id}")
def match_msme(id: int):
    return {"msme_id": id, "buyers": []}
