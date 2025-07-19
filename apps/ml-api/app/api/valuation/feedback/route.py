from fastapi import APIRouter, Request
from datetime import datetime
import json
import os

router = APIRouter()

@router.post("/api/valuation/feedback")
async def submit_feedback(request: Request):
    data = await request.json()
    data["timestamp"] = datetime.utcnow().isoformat()
    
    feedback_path = "apps/ml-api/feedback/corrections.jsonl"
    os.makedirs(os.path.dirname(feedback_path), exist_ok=True)
    
    with open(feedback_path, "a") as f:
        f.write(json.dumps(data) + "\n")
    
    return {"message": "Feedback recorded"}
