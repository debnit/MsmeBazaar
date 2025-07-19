from twilio.rest import Client
import os

def send_whatsapp_alert(to: str, message: str):
    client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
    client.messages.create(
        body=message,
        from_=f"whatsapp:{os.getenv('TWILIO_PHONE')}",
        to=f"whatsapp:{to}"
    )
.
