from ..repositories.notification_repo import save_inapp_notification
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

class InAppService:
    async def send(self, payload: NotificationRequest):
        logger.info("Saving In-App notification")
        await save_inapp_notification(payload)
