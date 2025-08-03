import requests
from ..config import settings

async def send_push_fcm(title: str, body: str):
    headers = {
        "Authorization": f"key={settings.FCM_SERVER_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "notification": {"title": title, "body": body},
        "to": "/topics/all"
    }
    requests.post("https://fcm.googleapis.com/fcm/send", json=payload, headers=headers)
