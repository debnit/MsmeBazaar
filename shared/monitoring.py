"""
Comprehensive Monitoring Service for MSMEBazaar Platform
Integrates Sentry error tracking, Prometheus metrics, and business analytics
"""

import os
import time
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from functools import wraps
import logging

# Prometheus imports
from prometheus_client import Counter, Histogram, Gauge, Summary, CollectorRegistry, generate_latest
import prometheus_client

# Sentry imports
import sentry_sdk
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.redis import RedisIntegration

logger = logging.getLogger(__name__)

class MSMEMonitoring:
    """Centralized monitoring service for MSME platform"""
    
    def __init__(self):
        self.registry = CollectorRegistry()
        self.metrics = {}
        self.setup_sentry()
        self.setup_prometheus()
    
    def setup_sentry(self):
        """Initialize Sentry error tracking"""
        sentry_dsn = os.getenv("SENTRY_DSN")
        environment = os.getenv("NODE_ENV", "development")
        
        if sentry_dsn:
            sentry_sdk.init(
                dsn=sentry_dsn,
                environment=environment,
                traces_sample_rate=0.1 if environment == "production" else 1.0,
                profiles_sample_rate=0.1 if environment == "production" else 1.0,
                integrations=[
                    FastApiIntegration(auto_enable=True),
                    SqlalchemyIntegration(),
                    RedisIntegration(),
                ],
                before_send=self._sentry_before_send,
                release=os.getenv("APP_VERSION", "1.0.0")
            )
            logger.info("Sentry monitoring initialized")
        else:
            logger.warning("Sentry DSN not configured - error tracking disabled")
    
    def _sentry_before_send(self, event, hint):
        """Filter Sentry events before sending"""
        # Skip certain error types in development
        if os.getenv("NODE_ENV") == "development":
            if event.get("logger") == "uvicorn":
                return None
        
        # Add custom context
        event.setdefault("contexts", {})
        event["contexts"]["business"] = {
            "service": os.getenv("SERVICE_NAME", "unknown"),
            "environment": os.getenv("NODE_ENV", "development")
        }
        
        return event
    
    def setup_prometheus(self):
        """Initialize Prometheus metrics"""
        # HTTP metrics
        self.metrics["http_requests_total"] = Counter(
            "msme_http_requests_total",
            "Total HTTP requests",
            ["method", "endpoint", "status", "service"],
            registry=self.registry
        )
        
        self.metrics["http_request_duration"] = Histogram(
            "msme_http_request_duration_seconds",
            "HTTP request duration",
            ["method", "endpoint", "service"],
            registry=self.registry,
            buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
        )
        
        # Database metrics
        self.metrics["db_queries_total"] = Counter(
            "msme_db_queries_total",
            "Total database queries",
            ["operation", "table", "status"],
            registry=self.registry
        )
        
        self.metrics["db_query_duration"] = Histogram(
            "msme_db_query_duration_seconds",
            "Database query duration",
            ["operation", "table"],
            registry=self.registry,
            buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
        )
        
        self.metrics["db_connections_active"] = Gauge(
            "msme_db_connections_active",
            "Active database connections",
            registry=self.registry
        )
        
        # Business metrics
        self.metrics["user_registrations_total"] = Counter(
            "msme_user_registrations_total",
            "Total user registrations",
            ["method", "role"],
            registry=self.registry
        )
        
        self.metrics["msme_listings_total"] = Counter(
            "msme_msme_listings_total",
            "Total MSME listings",
            ["status", "category"],
            registry=self.registry
        )
        
        self.metrics["valuations_requested_total"] = Counter(
            "msme_valuations_requested_total",
            "Total valuation requests",
            ["method", "status"],
            registry=self.registry
        )
        
        self.metrics["valuation_duration"] = Histogram(
            "msme_valuation_duration_seconds",
            "Valuation processing duration",
            ["method"],
            registry=self.registry,
            buckets=[0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0]
        )
        
        # Cache metrics
        self.metrics["cache_operations_total"] = Counter(
            "msme_cache_operations_total",
            "Total cache operations",
            ["operation", "status"],
            registry=self.registry
        )
        
        self.metrics["cache_hit_rate"] = Gauge(
            "msme_cache_hit_rate",
            "Cache hit rate percentage",
            registry=self.registry
        )
        
        # System metrics
        self.metrics["active_users"] = Gauge(
            "msme_active_users",
            "Currently active users",
            registry=self.registry
        )
        
        self.metrics["memory_usage"] = Gauge(
            "msme_memory_usage_bytes",
            "Memory usage in bytes",
            ["type"],
            registry=self.registry
        )
        
        self.metrics["errors_total"] = Counter(
            "msme_errors_total",
            "Total errors",
            ["type", "severity", "service"],
            registry=self.registry
        )
        
        logger.info("Prometheus metrics initialized")
    
    # HTTP request monitoring
    def record_http_request(self, method: str, endpoint: str, status_code: int, 
                           duration: float, service: str = "unknown"):
        """Record HTTP request metrics"""
        self.metrics["http_requests_total"].labels(
            method=method,
            endpoint=endpoint,
            status=str(status_code),
            service=service
        ).inc()
        
        self.metrics["http_request_duration"].labels(
            method=method,
            endpoint=endpoint,
            service=service
        ).observe(duration)
    
    # Database monitoring
    def record_db_query(self, operation: str, table: str, duration: float, success: bool = True):
        """Record database query metrics"""
        status = "success" if success else "error"
        
        self.metrics["db_queries_total"].labels(
            operation=operation,
            table=table,
            status=status
        ).inc()
        
        if success:
            self.metrics["db_query_duration"].labels(
                operation=operation,
                table=table
            ).observe(duration)
    
    def update_db_connections(self, active_connections: int):
        """Update active database connections"""
        self.metrics["db_connections_active"].set(active_connections)
    
    # Business event monitoring
    def record_user_registration(self, method: str, role: str):
        """Record user registration"""
        self.metrics["user_registrations_total"].labels(
            method=method,
            role=role
        ).inc()
    
    def record_msme_listing(self, status: str, category: str):
        """Record MSME listing creation"""
        self.metrics["msme_listings_total"].labels(
            status=status,
            category=category
        ).inc()
    
    def record_valuation_request(self, method: str, duration: float, success: bool = True):
        """Record valuation request"""
        status = "success" if success else "error"
        
        self.metrics["valuations_requested_total"].labels(
            method=method,
            status=status
        ).inc()
        
        if success:
            self.metrics["valuation_duration"].labels(
                method=method
            ).observe(duration)
    
    # Cache monitoring
    def record_cache_operation(self, operation: str, success: bool = True):
        """Record cache operation"""
        status = "hit" if success and operation == "get" else "miss" if operation == "get" else "success" if success else "error"
        
        self.metrics["cache_operations_total"].labels(
            operation=operation,
            status=status
        ).inc()
    
    def update_cache_hit_rate(self, hit_rate: float):
        """Update cache hit rate"""
        self.metrics["cache_hit_rate"].set(hit_rate)
    
    # System monitoring
    def update_active_users(self, count: int):
        """Update active user count"""
        self.metrics["active_users"].set(count)
    
    def update_memory_usage(self, memory_type: str, bytes_used: int):
        """Update memory usage"""
        self.metrics["memory_usage"].labels(type=memory_type).set(bytes_used)
    
    def record_error(self, error_type: str, severity: str, service: str = "unknown"):
        """Record error occurrence"""
        self.metrics["errors_total"].labels(
            type=error_type,
            severity=severity,
            service=service
        ).inc()
    
    # Sentry integration
    def capture_exception(self, error: Exception, context: Optional[Dict] = None, level: str = "error"):
        """Capture exception with Sentry"""
        with sentry_sdk.push_scope() as scope:
            if context:
                for key, value in context.items():
                    scope.set_context(key, value)
            
            scope.level = level
            sentry_sdk.capture_exception(error)
    
    def capture_message(self, message: str, level: str = "info", context: Optional[Dict] = None):
        """Capture message with Sentry"""
        with sentry_sdk.push_scope() as scope:
            if context:
                for key, value in context.items():
                    scope.set_context(key, value)
            
            scope.level = level
            sentry_sdk.capture_message(message)
    
    def set_user_context(self, user_id: str, email: Optional[str] = None, role: Optional[str] = None):
        """Set user context for error tracking"""
        sentry_sdk.set_user({
            "id": user_id,
            "email": email,
            "role": role
        })
    
    def set_transaction_context(self, name: str, operation: str):
        """Set transaction context"""
        sentry_sdk.set_transaction_name(name)
        with sentry_sdk.start_transaction(name=name, op=operation):
            pass
    
    # Metrics export
    def get_metrics(self) -> str:
        """Get Prometheus metrics in text format"""
        return generate_latest(self.registry).decode('utf-8')
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get service health status"""
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics_enabled": True,
            "sentry_enabled": bool(os.getenv("SENTRY_DSN")),
            "service": os.getenv("SERVICE_NAME", "unknown"),
            "version": os.getenv("APP_VERSION", "1.0.0")
        }

# Decorators for automatic monitoring
def monitor_endpoint(endpoint_name: Optional[str] = None, service: str = "api"):
    """Decorator to monitor HTTP endpoints"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            method = kwargs.get('method', 'UNKNOWN')
            endpoint = endpoint_name or func.__name__
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                monitoring_service.record_http_request(method, endpoint, 200, duration, service)
                return result
            except Exception as e:
                duration = time.time() - start_time
                monitoring_service.record_http_request(method, endpoint, 500, duration, service)
                monitoring_service.capture_exception(e, {
                    "endpoint": endpoint,
                    "method": method,
                    "duration": duration
                })
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            method = kwargs.get('method', 'UNKNOWN')
            endpoint = endpoint_name or func.__name__
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                monitoring_service.record_http_request(method, endpoint, 200, duration, service)
                return result
            except Exception as e:
                duration = time.time() - start_time
                monitoring_service.record_http_request(method, endpoint, 500, duration, service)
                monitoring_service.capture_exception(e, {
                    "endpoint": endpoint,
                    "method": method,
                    "duration": duration
                })
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

def monitor_db_operation(operation: str, table: str):
    """Decorator to monitor database operations"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                monitoring_service.record_db_query(operation, table, duration, True)
                return result
            except Exception as e:
                duration = time.time() - start_time
                monitoring_service.record_db_query(operation, table, duration, False)
                monitoring_service.capture_exception(e, {
                    "operation": operation,
                    "table": table,
                    "duration": duration
                })
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                monitoring_service.record_db_query(operation, table, duration, True)
                return result
            except Exception as e:
                duration = time.time() - start_time
                monitoring_service.record_db_query(operation, table, duration, False)
                monitoring_service.capture_exception(e, {
                    "operation": operation,
                    "table": table,
                    "duration": duration
                })
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

# Global monitoring service instance
monitoring_service = MSMEMonitoring()