import pytest
from src.services.email_service import EmailService
from src.models.notification import NotificationRequest

@pytest.mark.asyncio
async def test_send_email_success(monkeypatch):
    called = {}
    async def mock_send_email_ses(*args, **kwargs):
        called["sent"] = True
    monkeypatch.setattr("src.adapters.aws_ses_adapter.send_email_ses", mock_send_email_ses)

    payload = NotificationRequest(
        channel="email",
        recipient_email="test@example.com",
        message="Hello"
    )
    service = EmailService()
    await service.send(payload)
    assert called.get("sent") is True
