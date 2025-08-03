#!/bin/bash
set -e

echo "🚀 Setting up MSMEBazaar Notification Service v2.0..."

# Root path
SERVICE_PATH="microservices/notification-service"

# Clean up old service
rm -rf $SERVICE_PATH
mkdir -p $SERVICE_PATH/src/{api/routes,core,models,services,workers,adapters,repositories,utils,telemetry}
mkdir -p $SERVICE_PATH/tests/{unit,integration}
mkdir -p $SERVICE_PATH/templates/{email,sms,whatsapp}
mkdir -p $SERVICE_PATH/docker

# =======================================
# main.py (FastAPI Entrypoint)
# =======================================
cat <<'EOF' > $SERVICE_PATH/src/main.py
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
from .config import settings
from .core.logger import configure_logging
from .api.routes import notifications, status

# Configure logging
logger = configure_logging()

# App initialization
app = FastAPI(
    title="MSMEBazaar Notification Service",
    version="2.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None
)

# Include routes
app.include_router(status.router, prefix="/status", tags=["Status"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# Prometheus metrics
Instrumentator().instrument(app).expose(app)

@app.on_event("startup")
async def startup_event():
    logger.info("Notification Service started", extra={"env": settings.ENVIRONMENT})

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Notification Service shutting down")
EOF

# =======================================
# config.py (Pydantic Settings)
# =======================================
cat <<'EOF' > $SERVICE_PATH/src/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_NAME: str = "notification-service"
    APP_PORT: int = 8005

    # Messaging
    AWS_SES_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str

    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    WHATSAPP_API_URL: str
    WHATSAPP_API_TOKEN: str

    FCM_SERVER_KEY: str

    # Redis / Kafka
    REDIS_URL: str
    KAFKA_BROKER_URL: str

    # Database
    DATABASE_URL: str

    # Monitoring
    SENTRY_DSN: str = ""
    PROMETHEUS_ENABLED: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
EOF

# =======================================
# logger.py (Structured Logging)
# =======================================
cat <<'EOF' > $SERVICE_PATH/src/core/logger.py
import logging
import sys
import json
from pythonjsonlogger import jsonlogger

def configure_logging():
    logHandler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    logHandler.setFormatter(formatter)
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(logHandler)
    return logger
EOF

# =======================================
# .env.example
# =======================================
cat <<'EOF' > $SERVICE_PATH/.env.example
ENVIRONMENT=development
APP_PORT=8005

AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_SES_REGION=us-east-1

TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+10000000000

WHATSAPP_API_URL=https://graph.facebook.com/v17.0/your-id/messages
WHATSAPP_API_TOKEN=your_token

FCM_SERVER_KEY=your_fcm_key

REDIS_URL=redis://localhost:6379/0
KAFKA_BROKER_URL=localhost:9092

DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/msmebazaar

SENTRY_DSN=
EOF

# =======================================
# requirements.txt
# =======================================
cat <<'EOF' > $SERVICE_PATH/requirements.txt
fastapi==0.110.0
uvicorn[standard]==0.27.1
pydantic-settings==2.1.0
python-json-logger==2.0.7
prometheus-fastapi-instrumentator==6.1.0
boto3==1.34.34
twilio==8.12.0
firebase-admin==6.3.0
requests==2.31.0
redis==5.0.1
aiokafka==0.10.0
sentry-sdk==1.39.1
jinja2==3.1.3
celery==5.3.6
EOF

# =======================================
# requirements-dev.txt
# =======================================
cat <<'EOF' > $SERVICE_PATH/requirements-dev.txt
pytest==8.0.0
pytest-asyncio==0.23.2
httpx==0.26.0
black==24.2.0
isort==5.13.2
EOF

# =======================================
# Makefile
# =======================================
cat <<'EOF' > $SERVICE_PATH/Makefile
dev:
\tuvicorn src.main:app --reload --port \$(APP_PORT)

test:
\tpytest -v

lint:
\tblack src tests
\tisort src tests

worker:
\tcelery -A src.workers.celery_worker worker --loglevel=info

docker-build:
\tdocker build -t msmebazaar-notification-service .

docker-run:
\tdocker run -p 8005:8005 msmebazaar-notification-service
EOF

echo "✅ Base scaffold for Notification Service v2.0 created."
#!/bin/bash
set -e

SERVICE_PATH="microservices/notification-service"

# ================================
# status.py (Health/Readiness)
# ================================
cat <<'EOF' > $SERVICE_PATH/src/api/routes/status.py
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import socket
import time

router = APIRouter()

@router.get("/health")
async def health_check():
    return JSONResponse({
        "status": "ok",
        "service": "notification-service",
        "timestamp": time.time(),
        "hostname": socket.gethostname()
    })

@router.get("/readiness")
async def readiness_check():
    # In production, check DB/Redis/Kafka connections
    return {"ready": True}
EOF

# ================================
# notifications.py (Endpoints)
# ================================
cat <<'EOF' > $SERVICE_PATH/src/api/routes/notifications.py
from fastapi import APIRouter, Depends, HTTPException
from ...models.notification import NotificationRequest
from ...core.security import verify_jwt
from ...core.rate_limiter import rate_limiter
from ...services.notification_dispatcher import NotificationDispatcher

router = APIRouter()

@router.post("/")
async def send_notification(
    payload: NotificationRequest,
    user=Depends(verify_jwt),
    _=Depends(rate_limiter)
):
    try:
        dispatcher = NotificationDispatcher()
        task_id = await dispatcher.dispatch(payload)
        return {"status": "queued", "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
EOF

# ================================
# exceptions.py
# ================================
cat <<'EOF' > $SERVICE_PATH/src/core/exceptions.py
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
EOF

# ================================
# security.py (JWT Verification)
# ================================
cat <<'EOF' > $SERVICE_PATH/src/core/security.py
import jwt
from fastapi import Depends, HTTPException, Header
from ..config import settings

def verify_jwt(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.AWS_SECRET_ACCESS_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
EOF

# ================================
# rate_limiter.py (Redis Rate Limiting)
# ================================
cat <<'EOF' > $SERVICE_PATH/src/core/rate_limiter.py
import time
import redis
from fastapi import Depends, HTTPException
from ..config import settings

# Simple Redis connection
r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

def rate_limiter(user: dict = Depends(lambda: {"sub": "anonymous"})):
    """Allow max 30 notifications/minute per user."""
    user_id = user.get("sub", "anonymous")
    key = f"rate_limit:{user_id}"
    now = int(time.time())

    count = r.get(key)
    if count and int(count) >= 30:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    pipe = r.pipeline()
    pipe.incr(key, 1)
    pipe.expire(key, 60)
    pipe.execute()

    return True
EOF

# ================================
# models/notification.py
# ================================
cat <<'EOF' > $SERVICE_PATH/src/models/notification.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class NotificationRequest(BaseModel):
    channels: List[str] = Field(..., example=["email", "sms"])
    recipient_email: Optional[EmailStr] = None
    recipient_phone: Optional[str] = None
    title: Optional[str] = None
    message: str
    template_id: Optional[str] = None
EOF

# ================================
# services/notification_dispatcher.py
# ================================
cat <<'EOF' > $SERVICE_PATH/src/services/notification_dispatcher.py
import uuid
from ..services.email_service import EmailService
from ..services.sms_service import SMSService
from ..services.whatsapp_service import WhatsAppService
from ..services.push_service import PushService
from ..services.inapp_service import InAppService
from ..core.exceptions import ChannelDeliveryError

class NotificationDispatcher:
    def __init__(self):
        self.channel_map = {
            "email": EmailService(),
            "sms": SMSService(),
            "whatsapp": WhatsAppService(),
            "push": PushService(),
            "inapp": InAppService(),
        }

    async def dispatch(self, payload):
        task_id = str(uuid.uuid4())
        for channel in payload.channels:
            service = self.channel_map.get(channel)
            if not service:
                raise ChannelDeliveryError(channel, "Unsupported channel")
            try:
                await service.send(payload)
            except Exception as e:
                raise ChannelDeliveryError(channel, str(e))
        return task_id
EOF

echo "✅ Part 2: API + Core Services added for Notification Service v2.0."
#!/bin/bash
set -e

SERVICE_PATH="microservices/notification-service"

# ================================
# Email Service
# ================================
cat <<'EOF' > $SERVICE_PATH/src/services/email_service.py
from ..adapters.aws_ses_adapter import send_email_ses
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

class EmailService:
    async def send(self, payload: NotificationRequest):
        if not payload.recipient_email:
            raise ValueError("Missing recipient_email for email notification")
        logger.info("Sending email", extra={"to": payload.recipient_email})
        await send_email_ses(
            to_email=payload.recipient_email,
            subject=payload.title or "Notification",
            body=payload.message
        )
EOF

# ================================
# SMS Service
# ================================
cat <<'EOF' > $SERVICE_PATH/src/services/sms_service.py
from ..adapters.twilio_adapter import send_sms_twilio
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

class SMSService:
    async def send(self, payload: NotificationRequest):
        if not payload.recipient_phone:
            raise ValueError("Missing recipient_phone for SMS notification")
        logger.info("Sending SMS", extra={"to": payload.recipient_phone})
        await send_sms_twilio(
            to_phone=payload.recipient_phone,
            message=payload.message
        )
EOF

# ================================
# WhatsApp Service
# ================================
cat <<'EOF' > $SERVICE_PATH/src/services/whatsapp_service.py
from ..adapters.whatsapp_adapter import send_whatsapp_message
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

class WhatsAppService:
    async def send(self, payload: NotificationRequest):
        if not payload.recipient_phone:
            raise ValueError("Missing recipient_phone for WhatsApp notification")
        logger.info("Sending WhatsApp", extra={"to": payload.recipient_phone})
        await send_whatsapp_message(
            to_phone=payload.recipient_phone,
            message=payload.message
        )
EOF

# ================================
# Push Service
# ================================
cat <<'EOF' > $SERVICE_PATH/src/services/push_service.py
from ..adapters.fcm_adapter import send_push_fcm
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

class PushService:
    async def send(self, payload: NotificationRequest):
        logger.info("Sending Push notification")
        await send_push_fcm(
            title=payload.title or "Notification",
            body=payload.message
        )
EOF

# ================================
# In-App Service
# ================================
cat <<'EOF' > $SERVICE_PATH/src/services/inapp_service.py
from ..repositories.notification_repo import save_inapp_notification
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

class InAppService:
    async def send(self, payload: NotificationRequest):
        logger.info("Saving In-App notification")
        await save_inapp_notification(payload)
EOF

# ================================
# AWS SES Adapter
# ================================
cat <<'EOF' > $SERVICE_PATH/src/adapters/aws_ses_adapter.py
import boto3
from ..config import settings

ses_client = boto3.client(
    "ses",
    region_name=settings.AWS_SES_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)

async def send_email_ses(to_email: str, subject: str, body: str):
    ses_client.send_email(
        Source=f"noreply@msmebazaar.com",
        Destination={"ToAddresses": [to_email]},
        Message={
            "Subject": {"Data": subject},
            "Body": {"Text": {"Data": body}}
        }
    )
EOF

# ================================
# Twilio Adapter
# ================================
cat <<'EOF' > $SERVICE_PATH/src/adapters/twilio_adapter.py
from twilio.rest import Client
from ..config import settings

twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

async def send_sms_twilio(to_phone: str, message: str):
    twilio_client.messages.create(
        body=message,
        from_=settings.TWILIO_PHONE_NUMBER,
        to=to_phone
    )
EOF

# ================================
# WhatsApp Adapter
# ================================
cat <<'EOF' > $SERVICE_PATH/src/adapters/whatsapp_adapter.py
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
EOF

# ================================
# FCM Adapter
# ================================
cat <<'EOF' > $SERVICE_PATH/src/adapters/fcm_adapter.py
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
EOF

echo "✅ Part 3: Channel Services & Adapters created for Notification Service v2.0."
#!/bin/bash
set -e

SERVICE_PATH="microservices/notification-service"

# ================================
# Celery Worker
# ================================
cat <<'EOF' > $SERVICE_PATH/src/workers/celery_worker.py
from celery import Celery
from ..config import settings
from ..services.notification_dispatcher import NotificationDispatcher
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

celery_app = Celery(
    "notification_service",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

@celery_app.task(bind=True, max_retries=3)
def process_notification(self, payload_dict: dict):
    try:
        payload = NotificationRequest(**payload_dict)
        dispatcher = NotificationDispatcher()
        return celery_app.loop.run_until_complete(dispatcher.dispatch(payload))
    except Exception as e:
        logger.error(f"Celery task failed: {e}")
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
EOF

# ================================
# Retry Handler
# ================================
cat <<'EOF' > $SERVICE_PATH/src/workers/retry_handler.py
import asyncio
from ..core.logger import configure_logging
from ..core.exceptions import NotificationServiceError

logger = configure_logging()

async def retry_with_backoff(func, max_attempts=3, base_delay=1):
    for attempt in range(max_attempts):
        try:
            return await func()
        except NotificationServiceError as e:
            delay = base_delay * (2 ** attempt)
            logger.warning(f"Retry {attempt+1}/{max_attempts} after {delay}s: {e}")
            await asyncio.sleep(delay)
    raise NotificationServiceError("Max retry attempts exceeded")
EOF

# ================================
# Kafka / Redis Queue Consumer
# ================================
cat <<'EOF' > $SERVICE_PATH/src/services/queue_consumer.py
import asyncio
import json
import aiokafka
import redis.asyncio as aioredis
from ..config import settings
from ..services.notification_dispatcher import NotificationDispatcher
from ..models.notification import NotificationRequest
from ..core.logger import configure_logging

logger = configure_logging()

async def consume_kafka():
    consumer = aiokafka.AIOKafkaConsumer(
        settings.KAFKA_NOTIFICATION_TOPIC,
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id="notification_service"
    )
    await consumer.start()
    try:
        async for msg in consumer:
            payload_dict = json.loads(msg.value.decode())
            payload = NotificationRequest(**payload_dict)
            dispatcher = NotificationDispatcher()
            await dispatcher.dispatch(payload)
    finally:
        await consumer.stop()

async def consume_redis():
    redis_conn = aioredis.from_url(settings.REDIS_URL)
    pubsub = redis_conn.pubsub()
    await pubsub.subscribe("notifications")
    async for message in pubsub.listen():
        if message["type"] == "message":
            payload_dict = json.loads(message["data"])
            payload = NotificationRequest(**payload_dict)
            dispatcher = NotificationDispatcher()
            await dispatcher.dispatch(payload)

async def start_consumers():
    await asyncio.gather(
        consume_kafka(),
        consume_redis()
    )
EOF

# ================================
# Prometheus Metrics
# ================================
cat <<'EOF' > $SERVICE_PATH/src/telemetry/metrics.py
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
EOF

# ================================
# OpenTelemetry Tracing
# ================================
cat <<'EOF' > $SERVICE_PATH/src/telemetry/tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
trace.set_tracer_provider(provider)

otlp_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4318/v1/traces")
provider.add_span_processor(SimpleSpanProcessor(otlp_exporter))

tracer = trace.get_tracer("notification-service")
EOF

# ================================
# Sentry Logger
# ================================
cat <<'EOF' > $SERVICE_PATH/src/telemetry/sentry_logger.py
import sentry_sdk
from ..config import settings

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0
    )
EOF

echo "✅ Part 4: Async processing + telemetry added for Notification Service v2.0."
#!/bin/bash
set -e

SERVICE_PATH="microservices/notification-service"

# ================================
# Unit Tests: Email, SMS, Template
# ================================
mkdir -p $SERVICE_PATH/tests/unit

cat <<'EOF' > $SERVICE_PATH/tests/unit/test_email_service.py
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
EOF

cat <<'EOF' > $SERVICE_PATH/tests/unit/test_sms_service.py
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
EOF

cat <<'EOF' > $SERVICE_PATH/tests/unit/test_template_engine.py
from src.services.template_engine import TemplateEngine

def test_render_template():
    engine = TemplateEngine()
    html = engine.render("email/welcome_email.html", {"name": "User"})
    assert "User" in html
EOF

# ================================
# Integration Test: Dispatcher
# ================================
mkdir -p $SERVICE_PATH/tests/integration

cat <<'EOF' > $SERVICE_PATH/tests/integration/test_dispatch_flow.py
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
EOF

# ================================
# Dockerfile
# ================================
mkdir -p $SERVICE_PATH/docker

cat <<'EOF' > $SERVICE_PATH/docker/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY src ./src

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8003"]
EOF

# ================================
# docker-compose.override.yml
# ================================
cat <<'EOF' > $SERVICE_PATH/docker/docker-compose.override.yml
version: "3.9"
services:
  notification-service:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "8003:8003"
    environment:
      - ENVIRONMENT=development
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
      - kafka

  redis:
    image: redis:7.0
    ports:
      - "6379:6379"

  kafka:
    image: bitnami/kafka:3
    environment:
      - KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper:2181
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper

  zookeeper:
    image: bitnami/zookeeper:3.8
    ports:
      - "2181:2181"
EOF

# ================================
# Makefile
# ================================
cat <<'EOF' > $SERVICE_PATH/Makefile
.PHONY: install run test lint format docker-up docker-down

install:
\tpip install -r requirements.txt
\tpip install -r requirements-dev.txt

run:
\tuvicorn src.main:app --reload --host 0.0.0.0 --port 8003

test:
\tpytest --asyncio-mode=auto --maxfail=1 --disable-warnings -q

lint:
\tflake8 src

format:
\tblack src

docker-up:
\tdocker compose -f docker/docker-compose.override.yml up -d --build

docker-down:
\tdocker compose -f docker/docker-compose.override.yml down
EOF

# ================================
# Requirements
# ================================
cat <<'EOF' > $SERVICE_PATH/requirements.txt
fastapi==0.110.0
uvicorn[standard]==0.29.0
pydantic==2.6.3
boto3==1.34.57
twilio==8.10.0
requests==2.31.0
prometheus-client==0.20.0
opentelemetry-sdk==1.25.0
opentelemetry-exporter-otlp==1.25.0
redis==5.0.1
aiokafka==0.10.0
celery==5.3.4
EOF

cat <<'EOF' > $SERVICE_PATH/requirements-dev.txt
pytest==8.0.0
pytest-asyncio==0.23.4
flake8==7.0.0
black==24.2.0
mypy==1.8.0
EOF

echo "✅ Part 5: Tests, Docker, Makefile, and requirements ready for Notification Service v2.0."
