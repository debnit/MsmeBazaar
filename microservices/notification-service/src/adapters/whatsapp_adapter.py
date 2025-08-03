import requests
from ..config import settings

async def send_whatsapp_message(to_phone: str, message: str):
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": message}
    }
    requests.post(settings.WHATSAPP_API_URL, json=payload, headers=headers)
