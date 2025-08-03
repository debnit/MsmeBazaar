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
