from pydantic import BaseModel
from typing import List

class Recommendation(BaseModel):
    item_id: str
    score: float

class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: List[Recommendation]
