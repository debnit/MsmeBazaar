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
