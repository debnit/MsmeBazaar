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
