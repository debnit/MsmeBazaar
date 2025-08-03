from fastapi import APIRouter, Depends, HTTPException
from ...models.notification import NotificationRequest
from ...core.security import verify_jwt
from ...core.rate_limiter import rate_limiter
from ...services.notification_dispatcher import NotificationDispatcher

router = APIRouter()

@router.post("/")
async def send_notification(
    payload: NotificationRequest,
    user=Depends(verify_jwt),
    _=Depends(rate_limiter)
):
    try:
        dispatcher = NotificationDispatcher()
        task_id = await dispatcher.dispatch(payload)
        return {"status": "queued", "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
