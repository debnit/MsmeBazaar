"""
Redis Caching Service for MSMEBazaar Platform
Provides centralized caching, session management, and rate limiting
"""

import redis
import json
import pickle
import asyncio
from typing import Any, Optional, Dict, List, Union
from datetime import datetime, timedelta
import os
import logging
from functools import wraps
import hashlib

logger = logging.getLogger(__name__)

class MSMERedisService:
    """Centralized Redis service for the MSME platform"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client = None
        self.connection_pool = None
        self.connect()
    
    def connect(self):
        """Establish Redis connection with connection pooling"""
        try:
            self.connection_pool = redis.ConnectionPool.from_url(
                self.redis_url,
                max_connections=20,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            self.redis_client = redis.Redis(connection_pool=self.connection_pool)
            
            # Test connection
            self.redis_client.ping()
            logger.info("Redis connection established successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            # Fallback to mock cache for development
            self.redis_client = MockRedisClient()
    
    def generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate standardized cache key"""
        key_parts = [prefix]
        key_parts.extend(str(arg) for arg in args)
        
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            kwargs_str = "_".join(f"{k}:{v}" for k, v in sorted_kwargs)
            key_parts.append(kwargs_str)
        
        return ":".join(key_parts)
    
    def set(self, key: str, value: Any, expiration: int = 3600) -> bool:
        """Set value in cache with expiration"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value, default=str)
            elif not isinstance(value, str):
                value = pickle.dumps(value)
            
            result = self.redis_client.setex(key, expiration, value)
            logger.debug(f"Cache SET: {key} (expires in {expiration}s)")
            return result
        except Exception as e:
            logger.error(f"Cache SET error for key {key}: {str(e)}")
            return False
    
    def get(self, key: str) -> Any:
        """Get value from cache"""
        try:
            value = self.redis_client.get(key)
            if value is None:
                logger.debug(f"Cache MISS: {key}")
                return None
            
            logger.debug(f"Cache HIT: {key}")
            
            # Try to decode as JSON first
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                # Try pickle
                try:
                    return pickle.loads(value)
                except:
                    return value.decode('utf-8')
                    
        except Exception as e:
            logger.error(f"Cache GET error for key {key}: {str(e)}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            result = self.redis_client.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return bool(result)
        except Exception as e:
            logger.error(f"Cache DELETE error for key {key}: {str(e)}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                result = self.redis_client.delete(*keys)
                logger.debug(f"Cache DELETE PATTERN: {pattern} ({len(keys)} keys)")
                return result
            return 0
        except Exception as e:
            logger.error(f"Cache DELETE PATTERN error for {pattern}: {str(e)}")
            return 0
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Cache EXISTS error for key {key}: {str(e)}")
            return False
    
    def ttl(self, key: str) -> int:
        """Get time to live for key"""
        try:
            return self.redis_client.ttl(key)
        except Exception as e:
            logger.error(f"Cache TTL error for key {key}: {str(e)}")
            return -1
    
    def increment(self, key: str, amount: int = 1, expiration: int = 3600) -> int:
        """Increment counter with expiration"""
        try:
            pipe = self.redis_client.pipeline()
            pipe.incr(key, amount)
            pipe.expire(key, expiration)
            result = pipe.execute()
            return result[0]
        except Exception as e:
            logger.error(f"Cache INCREMENT error for key {key}: {str(e)}")
            return 0
    
    # Session Management
    def set_session(self, session_id: str, user_data: Dict, expiration: int = 86400):
        """Set user session data"""
        key = self.generate_key("session", session_id)
        return self.set(key, user_data, expiration)
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get user session data"""
        key = self.generate_key("session", session_id)
        return self.get(key)
    
    def delete_session(self, session_id: str) -> bool:
        """Delete user session"""
        key = self.generate_key("session", session_id)
        return self.delete(key)
    
    # Rate Limiting
    def is_rate_limited(self, identifier: str, limit: int, window: int) -> bool:
        """Check if request is rate limited"""
        key = self.generate_key("rate_limit", identifier)
        current_count = self.increment(key, 1, window)
        
        if current_count > limit:
            logger.warning(f"Rate limit exceeded for {identifier}: {current_count}/{limit}")
            return True
        
        return False
    
    # Business-specific caching methods
    def cache_user_profile(self, user_id: str, profile_data: Dict, expiration: int = 1800):
        """Cache user profile data"""
        key = self.generate_key("user_profile", user_id)
        return self.set(key, profile_data, expiration)
    
    def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Get cached user profile"""
        key = self.generate_key("user_profile", user_id)
        return self.get(key)
    
    def cache_msme_listing(self, listing_id: str, listing_data: Dict, expiration: int = 3600):
        """Cache MSME listing data"""
        key = self.generate_key("msme_listing", listing_id)
        return self.set(key, listing_data, expiration)
    
    def get_msme_listing(self, listing_id: str) -> Optional[Dict]:
        """Get cached MSME listing"""
        key = self.generate_key("msme_listing", listing_id)
        return self.get(key)
    
    def cache_valuation_result(self, msme_id: str, valuation_data: Dict, expiration: int = 7200):
        """Cache valuation results"""
        key = self.generate_key("valuation", msme_id)
        return self.set(key, valuation_data, expiration)
    
    def get_valuation_result(self, msme_id: str) -> Optional[Dict]:
        """Get cached valuation result"""
        key = self.generate_key("valuation", msme_id)
        return self.get(key)
    
    def invalidate_user_cache(self, user_id: str):
        """Invalidate all cache entries for a user"""
        patterns = [
            f"user_profile:{user_id}*",
            f"session:*:{user_id}*",
            f"rate_limit:{user_id}*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            total_deleted += self.delete_pattern(pattern)
        
        logger.info(f"Invalidated {total_deleted} cache entries for user {user_id}")
        return total_deleted
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        try:
            info = self.redis_client.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "0B"),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": round(
                    info.get("keyspace_hits", 0) / 
                    max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1) * 100, 2
                )
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {str(e)}")
            return {}

class MockRedisClient:
    """Mock Redis client for development/testing"""
    
    def __init__(self):
        self.data = {}
        logger.warning("Using MockRedisClient - Redis unavailable")
    
    def ping(self):
        return True
    
    def setex(self, key, expiration, value):
        self.data[key] = {"value": value, "expires": datetime.utcnow() + timedelta(seconds=expiration)}
        return True
    
    def get(self, key):
        if key in self.data:
            if datetime.utcnow() < self.data[key]["expires"]:
                return self.data[key]["value"]
            else:
                del self.data[key]
        return None
    
    def delete(self, *keys):
        count = 0
        for key in keys:
            if key in self.data:
                del self.data[key]
                count += 1
        return count
    
    def exists(self, key):
        return key in self.data and datetime.utcnow() < self.data[key]["expires"]
    
    def keys(self, pattern):
        import fnmatch
        return [key for key in self.data.keys() if fnmatch.fnmatch(key, pattern)]
    
    def incr(self, key, amount=1):
        if key not in self.data:
            self.data[key] = {"value": "0", "expires": datetime.utcnow() + timedelta(hours=1)}
        
        current_value = int(self.data[key]["value"])
        new_value = current_value + amount
        self.data[key]["value"] = str(new_value)
        return new_value
    
    def expire(self, key, seconds):
        if key in self.data:
            self.data[key]["expires"] = datetime.utcnow() + timedelta(seconds=seconds)
        return True
    
    def pipeline(self):
        return MockPipeline(self)
    
    def info(self):
        return {
            "connected_clients": 1,
            "used_memory_human": "1KB",
            "total_commands_processed": len(self.data),
            "keyspace_hits": 0,
            "keyspace_misses": 0
        }

class MockPipeline:
    """Mock Redis pipeline"""
    
    def __init__(self, client):
        self.client = client
        self.commands = []
    
    def incr(self, key, amount=1):
        self.commands.append(("incr", key, amount))
        return self
    
    def expire(self, key, seconds):
        self.commands.append(("expire", key, seconds))
        return self
    
    def execute(self):
        results = []
        for cmd, *args in self.commands:
            if cmd == "incr":
                results.append(self.client.incr(*args))
            elif cmd == "expire":
                results.append(self.client.expire(*args))
        return results

# Decorator for caching function results
def cache_result(expiration: int = 3600, key_prefix: str = "func"):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            func_name = f"{func.__module__}.{func.__name__}"
            args_str = "_".join(str(arg) for arg in args)
            kwargs_str = "_".join(f"{k}:{v}" for k, v in sorted(kwargs.items()))
            
            cache_key = redis_service.generate_key(key_prefix, func_name, args_str, kwargs_str)
            
            # Try to get from cache
            cached_result = redis_service.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            redis_service.set(cache_key, result, expiration)
            return result
        
        return wrapper
    return decorator

# Global Redis service instance
redis_service = MSMERedisService()