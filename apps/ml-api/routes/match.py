from fastapi import APIRouter

router = APIRouter()

@router.get("/buyer/{buyer_id}")
def match_buyer(buyer_id: str):
    return {"buyer_id": buyer_id, "matched_msmes": ["msme1", "msme2"]}

@router.get("/msme/{msme_id}")
def match_msme(msme_id: str):
    return {"msme_id": msme_id, "matched_buyers": ["buyer1", "buyer2"]}