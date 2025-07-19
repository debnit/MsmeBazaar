"""
Health check and metrics endpoints for Auth API
"""
import time
import psutil
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
import asyncpg
import redis.asyncio as redis
from pydantic import BaseModel
from typing import Dict, Optional
import os

router = APIRouter()

# Store startup time for uptime calculation
startup_time = time.time()

class HealthCheck(BaseModel):
    status: str
    timestamp: str
    uptime: float
    version: str
    environment: str
    checks: Dict[str, str]

class MetricsData:
    def __init__(self):
        self.request_count = 0
        self.request_duration_sum = 0.0
        self.request_duration_count = 0
        self.error_count = 0

metrics_data = MetricsData()

async def check_database() -> str:
    """Check database connectivity"""
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            return "unhealthy"
        
        conn = await asyncpg.connect(database_url)
        await conn.execute("SELECT 1")
        await conn.close()
        return "healthy"
    except Exception as e:
        print(f"Database health check failed: {e}")
        return "unhealthy"

async def check_redis() -> str:
    """Check Redis connectivity"""
    try:
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            return "unhealthy"
        
        redis_client = redis.from_url(redis_url)
        await redis_client.ping()
        await redis_client.close()
        return "healthy"
    except Exception as e:
        print(f"Redis health check failed: {e}")
        return "unhealthy"

@router.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint"""
    try:
        # Run health checks in parallel
        database_status, redis_status = await asyncio.gather(
            check_database(),
            check_redis(),
            return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(database_status, Exception):
            database_status = "unhealthy"
        if isinstance(redis_status, Exception):
            redis_status = "unhealthy"
        
        checks = {
            "database": database_status,
            "redis": redis_status
        }
        
        # Determine overall status
        overall_status = "healthy" if all(status == "healthy" for status in checks.values()) else "unhealthy"
        
        return HealthCheck(
            status=overall_status,
            timestamp=datetime.utcnow().isoformat(),
            uptime=time.time() - startup_time,
            version=os.getenv("API_VERSION", "1.0.0"),
            environment=os.getenv("ENVIRONMENT", "development"),
            checks=checks
        )
    except Exception as e:
        print(f"Health check endpoint failed: {e}")
        raise HTTPException(status_code=503, detail="Health check failed")

@router.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    """Prometheus metrics endpoint"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Calculate uptime
        uptime = time.time() - startup_time
        
        # Generate Prometheus format metrics
        metrics_text = f"""# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total {{service="auth-api"}} {metrics_data.request_count}

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds summary
http_request_duration_seconds_sum {{service="auth-api"}} {metrics_data.request_duration_sum}
http_request_duration_seconds_count {{service="auth-api"}} {metrics_data.request_duration_count}

# HELP http_errors_total Total number of HTTP errors
# TYPE http_errors_total counter
http_errors_total {{service="auth-api"}} {metrics_data.error_count}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds {{service="auth-api"}} {uptime}

# HELP process_cpu_usage_percent CPU usage percentage
# TYPE process_cpu_usage_percent gauge
process_cpu_usage_percent {{service="auth-api"}} {cpu_percent}

# HELP process_memory_usage_bytes Memory usage in bytes
# TYPE process_memory_usage_bytes gauge
process_memory_usage_bytes {{service="auth-api",type="total"}} {memory.total}
process_memory_usage_bytes {{service="auth-api",type="used"}} {memory.used}
process_memory_usage_bytes {{service="auth-api",type="available"}} {memory.available}

# HELP process_disk_usage_bytes Disk usage in bytes
# TYPE process_disk_usage_bytes gauge
process_disk_usage_bytes {{service="auth-api",type="total"}} {disk.total}
process_disk_usage_bytes {{service="auth-api",type="used"}} {disk.used}
process_disk_usage_bytes {{service="auth-api",type="free"}} {disk.free}

# HELP python_info Python version info
# TYPE python_info gauge
python_info {{service="auth-api",version="{os.sys.version.split()[0]}"}} 1
"""
        
        return PlainTextResponse(content=metrics_text, media_type="text/plain; version=0.0.4; charset=utf-8")
    except Exception as e:
        print(f"Metrics endpoint failed: {e}")
        raise HTTPException(status_code=500, detail="Metrics generation failed")

def track_request_metrics(duration: float, status_code: int):
    """Track request metrics"""
    metrics_data.request_count += 1
    metrics_data.request_duration_sum += duration
    metrics_data.request_duration_count += 1
    
    if status_code >= 400:
        metrics_data.error_count += 1