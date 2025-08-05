from fastapi import APIRouter, Query
from app.services.recommendation_service import RecommendationService

router = APIRouter()
service = RecommendationService()

@router.get("/")
async def get_recommendations(user_id: str = Query(...)):
    return service.get_recommendations(user_id)
