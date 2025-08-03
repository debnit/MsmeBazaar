import uuid
from ..services.email_service import EmailService
from ..services.sms_service import SMSService
from ..services.whatsapp_service import WhatsAppService
from ..services.push_service import PushService
from ..services.inapp_service import InAppService
from ..core.exceptions import ChannelDeliveryError

class NotificationDispatcher:
    def __init__(self):
        self.channel_map = {
            "email": EmailService(),
            "sms": SMSService(),
            "whatsapp": WhatsAppService(),
            "push": PushService(),
            "inapp": InAppService(),
        }

    async def dispatch(self, payload):
        task_id = str(uuid.uuid4())
        for channel in payload.channels:
            service = self.channel_map.get(channel)
            if not service:
                raise ChannelDeliveryError(channel, "Unsupported channel")
            try:
                await service.send(payload)
            except Exception as e:
                raise ChannelDeliveryError(channel, str(e))
        return task_id
