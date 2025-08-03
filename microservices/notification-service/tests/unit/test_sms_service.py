import pytest
from src.services.sms_service import SMSService
from src.models.notification import NotificationRequest

@pytest.mark.asyncio
async def test_send_sms_success(monkeypatch):
    called = {}
    async def mock_send_sms_twilio(*args, **kwargs):
        called["sent"] = True
    monkeypatch.setattr("src.adapters.twilio_adapter.send_sms_twilio", mock_send_sms_twilio)

    payload = NotificationRequest(
        channel="sms",
        recipient_phone="+911234567890",
        message="OTP 1234"
    )
    service = SMSService()
    await service.send(payload)
    assert called.get("sent") is True
