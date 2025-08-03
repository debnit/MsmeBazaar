import pytest
from src.services.notification_dispatcher import NotificationDispatcher
from src.models.notification import NotificationRequest

@pytest.mark.asyncio
async def test_dispatch_email(monkeypatch):
    called = {}
    async def mock_send_email(*args, **kwargs):
        called["sent"] = True
    monkeypatch.setattr("src.services.email_service.EmailService.send", mock_send_email)

    dispatcher = NotificationDispatcher()
    payload = NotificationRequest(
        channel="email",
        recipient_email="test@example.com",
        message="Hello"
    )
    await dispatcher.dispatch(payload)
    assert called.get("sent") is True
