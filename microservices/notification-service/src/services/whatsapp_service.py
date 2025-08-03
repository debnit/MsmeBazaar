from ..adapters.whatsapp_adapter import send_whatsapp_message
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

class WhatsAppService:
    async def send(self, payload: NotificationRequest):
        if not payload.recipient_phone:
            raise ValueError("Missing recipient_phone for WhatsApp notification")
        logger.info("Sending WhatsApp", extra={"to": payload.recipient_phone})
        await send_whatsapp_message(
            to_phone=payload.recipient_phone,
            message=payload.message
        )
