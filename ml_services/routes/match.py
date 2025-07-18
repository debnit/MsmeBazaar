from fastapi import APIRouter

router = APIRouter()

@router.get("/buyer/{id}")
def get_matching_msmes(id: str):
    return {
        "buyer_id": id,
        "matches": ["msme123", "msme456", "msme789"]
    }

@router.get("/msme/{id}")
def get_matching_buyers(id: str):
    return {
        "msme_id": id,
        "matches": ["buyer001", "buyer002"]
    }
