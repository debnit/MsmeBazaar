from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class NotificationRequest(BaseModel):
    channels: List[str] = Field(..., example=["email", "sms"])
    recipient_email: Optional[EmailStr] = None
    recipient_phone: Optional[str] = None
    title: Optional[str] = None
    message: str
    template_id: Optional[str] = None
