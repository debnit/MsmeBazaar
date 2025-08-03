class NotificationServiceError(Exception):
    """Base class for notification service errors."""
    pass

class ChannelDeliveryError(NotificationServiceError):
    """Raised when delivery to a specific channel fails."""
    def __init__(self, channel: str, message: str):
        self.channel = channel
        super().__init__(f"[{channel}] {message}")

class InvalidNotificationPayload(NotificationServiceError):
    """Raised when a notification payload is invalid."""
    pass
