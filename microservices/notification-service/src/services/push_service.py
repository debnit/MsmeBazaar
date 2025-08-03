from ..adapters.fcm_adapter import send_push_fcm
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

class PushService:
    async def send(self, payload: NotificationRequest):
        logger.info("Sending Push notification")
        await send_push_fcm(
            title=payload.title or "Notification",
            body=payload.message
        )
