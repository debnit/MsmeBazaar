from celery import Celery
from ..config import settings
from ..services.notification_dispatcher import NotificationDispatcher
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

celery_app = Celery(
    "notification_service",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

@celery_app.task(bind=True, max_retries=3)
def process_notification(self, payload_dict: dict):
    try:
        payload = NotificationRequest(**payload_dict)
        dispatcher = NotificationDispatcher()
        return celery_app.loop.run_until_complete(dispatcher.dispatch(payload))
    except Exception as e:
        logger.error(f"Celery task failed: {e}")
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
