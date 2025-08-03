from twilio.rest import Client
from ..config import settings

twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

async def send_sms_twilio(to_phone: str, message: str):
    twilio_client.messages.create(
        body=message,
        from_=settings.TWILIO_PHONE_NUMBER,
        to=to_phone
    )
