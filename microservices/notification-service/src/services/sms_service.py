from ..adapters.twilio_adapter import send_sms_twilio
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

class SMSService:
    async def send(self, payload: NotificationRequest):
        if not payload.recipient_phone:
            raise ValueError("Missing recipient_phone for SMS notification")
        logger.info("Sending SMS", extra={"to": payload.recipient_phone})
        await send_sms_twilio(
            to_phone=payload.recipient_phone,
            message=payload.message
        )
