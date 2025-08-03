from prometheus_client import Counter, Histogram

NOTIFICATIONS_SENT = Counter(
    "notifications_sent_total", "Total notifications sent", ["channel"]
)
NOTIFICATION_LATENCY = Histogram(
    "notification_send_latency_seconds", "Latency for sending notifications", ["channel"]
)

def record_notification_sent(channel: str):
    NOTIFICATIONS_SENT.labels(channel=channel).inc()

def record_latency(channel: str, seconds: float):
    NOTIFICATION_LATENCY.labels(channel=channel).observe(seconds)
