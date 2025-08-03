from ..adapters.aws_ses_adapter import send_email_ses
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

class EmailService:
    async def send(self, payload: NotificationRequest):
        if not payload.recipient_email:
            raise ValueError("Missing recipient_email for email notification")
        logger.info("Sending email", extra={"to": payload.recipient_email})
        await send_email_ses(
            to_email=payload.recipient_email,
            subject=payload.title or "Notification",
            body=payload.message
        )
