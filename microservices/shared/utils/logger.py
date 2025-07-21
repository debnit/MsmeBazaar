"""
Enhanced Structured Logging for MSMEBazaar
Comprehensive logging with security, audit, and monitoring features
"""

import os
import sys
import time
import json
import traceback
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
import structlog
from structlog.types import EventDict, Processor
import logging
import logging.config
from pythonjsonlogger import jsonlogger


class LogLevel(Enum):
    """Log levels for structured logging"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class SecurityEventType(Enum):
    """Security event types for audit logging"""
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILURE = "auth_failure"
    AUTH_LOGOUT = "auth_logout"
    PERMISSION_DENIED = "permission_denied"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    ADMIN_ACTION = "admin_action"
    API_KEY_USAGE = "api_key_usage"


def add_correlation_id(logger, method_name: str, event_dict: EventDict) -> EventDict:
    """Add correlation ID for request tracing"""
    # Try to get correlation ID from context (would be set by middleware)
    correlation_id = getattr(structlog.contextvars, 'correlation_id', None)
    if correlation_id:
        event_dict['correlation_id'] = correlation_id
    return event_dict


def add_service_info(logger, method_name: str, event_dict: EventDict) -> EventDict:
    """Add service information to log entries"""
    event_dict.update({
        'service': os.getenv('SERVICE_NAME', 'msmebazaar'),
        'version': os.getenv('SERVICE_VERSION', '1.0.0'),
        'environment': os.getenv('ENVIRONMENT', 'development')
    })
    return event_dict


def add_security_context(logger, method_name: str, event_dict: EventDict) -> EventDict:
    """Add security context to sensitive operations"""
    # Check if this is a security-related event
    event_type = event_dict.get('event_type')
    if event_type and hasattr(SecurityEventType, event_type.upper()):
        event_dict['security_event'] = True
        event_dict['requires_audit'] = True
    
    return event_dict


def sanitize_sensitive_data(logger, method_name: str, event_dict: EventDict) -> EventDict:
    """Remove or mask sensitive data from logs"""
    sensitive_fields = [
        'password', 'token', 'secret', 'key', 'authorization',
        'ssn', 'social_security', 'credit_card', 'pan_number',
        'aadhar', 'passport', 'driving_license'
    ]
    
    def sanitize_dict(data):
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                if any(sensitive in key.lower() for sensitive in sensitive_fields):
                    if value:
                        # Mask the value
                        if len(str(value)) > 4:
                            sanitized[key] = f"{'*' * (len(str(value)) - 4)}{str(value)[-4:]}"
                        else:
                            sanitized[key] = "*" * len(str(value))
                    else:
                        sanitized[key] = value
                else:
                    sanitized[key] = sanitize_dict(value) if isinstance(value, (dict, list)) else value
            return sanitized
        elif isinstance(data, list):
            return [sanitize_dict(item) for item in data]
        else:
            return data
    
    # Sanitize the entire event dict
    return sanitize_dict(event_dict)


def add_performance_metrics(logger, method_name: str, event_dict: EventDict) -> EventDict:
    """Add performance metrics to log entries"""
    # Add timestamp for performance tracking
    event_dict['timestamp'] = datetime.utcnow().isoformat()
    
    # Add memory usage if available
    try:
        import psutil
        process = psutil.Process()
        event_dict['memory_usage_mb'] = round(process.memory_info().rss / 1024 / 1024, 2)
    except ImportError:
        pass
    
    return event_dict


def format_exception(logger, method_name: str, event_dict: EventDict) -> EventDict:
    """Format exception information for better readability"""
    if 'exception' in event_dict:
        exc_info = event_dict.get('exc_info')
        if exc_info:
            event_dict['exception_traceback'] = ''.join(traceback.format_exception(*exc_info))
    
    return event_dict


# Custom JSON formatter for standard logging
class MSMEJSONFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional fields"""
    
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        
        # Add standard fields
        log_record['service'] = os.getenv('SERVICE_NAME', 'msmebazaar')
        log_record['environment'] = os.getenv('ENVIRONMENT', 'development')
        log_record['timestamp'] = datetime.utcnow().isoformat()
        
        # Add level if not present
        if 'level' not in log_record:
            log_record['level'] = record.levelname


def configure_logging(
    service_name: str = "msmebazaar",
    log_level: str = "INFO",
    enable_json: bool = True,
    enable_audit: bool = True
):
    """
    Configure comprehensive logging for the service
    """
    
    # Set service name in environment
    os.environ['SERVICE_NAME'] = service_name
    
    # Configure structlog processors
    processors: List[Processor] = [
        # Add standard context
        add_service_info,
        add_correlation_id,
        add_security_context,
        add_performance_metrics,
        
        # Data sanitization (important for security)
        sanitize_sensitive_data,
        
        # Standard structlog processors
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        format_exception,
    ]
    
    if enable_json:
        # JSON output for production
        processors.extend([
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer()
        ])
    else:
        # Human-readable output for development
        processors.extend([
            structlog.processors.TimeStamper(fmt="[%Y-%m-%d %H:%M:%S]"),
            structlog.dev.ConsoleRenderer(colors=True)
        ])
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard logging
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'json': {
                '()': MSMEJSONFormatter,
                'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
            },
            'standard': {
                'format': '[%(asctime)s] %(name)s %(levelname)s: %(message)s'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'json' if enable_json else 'standard',
                'stream': sys.stdout
            }
        },
        'loggers': {
            '': {  # Root logger
                'handlers': ['console'],
                'level': log_level,
                'propagate': False
            },
            'uvicorn': {
                'handlers': ['console'],
                'level': 'INFO',
                'propagate': False
            },
            'fastapi': {
                'handlers': ['console'],
                'level': 'INFO',
                'propagate': False
            }
        }
    }
    
    # Apply logging configuration
    logging.config.dictConfig(logging_config)
    
    # Set up audit logging if enabled
    if enable_audit:
        setup_audit_logging()


def setup_audit_logging():
    """
    Set up separate audit logging for security events
    """
    audit_logger = logging.getLogger('audit')
    
    # Create audit file handler if in production
    if os.getenv('ENVIRONMENT') == 'production':
        audit_handler = logging.FileHandler('/var/log/msmebazaar/audit.log')
        audit_handler.setFormatter(MSMEJSONFormatter())
        audit_logger.addHandler(audit_handler)
    
    audit_logger.setLevel(logging.INFO)


class SecurityLogger:
    """
    Specialized logger for security events
    """
    
    def __init__(self):
        self.logger = structlog.get_logger('security')
        self.audit_logger = logging.getLogger('audit')
    
    def log_auth_success(self, user_id: str, method: str, ip_address: str, **kwargs):
        """Log successful authentication"""
        self._log_security_event(
            SecurityEventType.AUTH_SUCCESS,
            user_id=user_id,
            auth_method=method,
            ip_address=ip_address,
            **kwargs
        )
    
    def log_auth_failure(self, attempted_user: str, method: str, ip_address: str, reason: str, **kwargs):
        """Log failed authentication"""
        self._log_security_event(
            SecurityEventType.AUTH_FAILURE,
            attempted_user=attempted_user,
            auth_method=method,
            ip_address=ip_address,
            failure_reason=reason,
            **kwargs
        )
    
    def log_permission_denied(self, user_id: str, resource: str, action: str, ip_address: str, **kwargs):
        """Log permission denied events"""
        self._log_security_event(
            SecurityEventType.PERMISSION_DENIED,
            user_id=user_id,
            resource=resource,
            attempted_action=action,
            ip_address=ip_address,
            **kwargs
        )
    
    def log_rate_limit_exceeded(self, identifier: str, endpoint: str, limit: int, **kwargs):
        """Log rate limiting events"""
        self._log_security_event(
            SecurityEventType.RATE_LIMIT_EXCEEDED,
            identifier=identifier,
            endpoint=endpoint,
            rate_limit=limit,
            **kwargs
        )
    
    def log_suspicious_activity(self, description: str, user_id: Optional[str] = None, ip_address: Optional[str] = None, **kwargs):
        """Log suspicious activity"""
        self._log_security_event(
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            description=description,
            user_id=user_id,
            ip_address=ip_address,
            **kwargs
        )
    
    def log_data_access(self, user_id: str, resource: str, action: str, **kwargs):
        """Log data access events"""
        self._log_security_event(
            SecurityEventType.DATA_ACCESS,
            user_id=user_id,
            resource=resource,
            action=action,
            **kwargs
        )
    
    def log_admin_action(self, admin_user_id: str, action: str, target: str, **kwargs):
        """Log administrative actions"""
        self._log_security_event(
            SecurityEventType.ADMIN_ACTION,
            admin_user_id=admin_user_id,
            action=action,
            target=target,
            **kwargs
        )
    
    def _log_security_event(self, event_type: SecurityEventType, **kwargs):
        """Internal method to log security events"""
        event_data = {
            'event_type': event_type.value,
            'timestamp': datetime.utcnow().isoformat(),
            **kwargs
        }
        
        # Log to main logger
        self.logger.warning("Security event", **event_data)
        
        # Log to audit logger
        self.audit_logger.info(json.dumps(event_data))


class PerformanceLogger:
    """
    Logger for performance monitoring
    """
    
    def __init__(self):
        self.logger = structlog.get_logger('performance')
    
    def log_request_timing(self, endpoint: str, method: str, duration_ms: float, status_code: int, **kwargs):
        """Log request timing information"""
        self.logger.info(
            "Request completed",
            endpoint=endpoint,
            method=method,
            duration_ms=duration_ms,
            status_code=status_code,
            **kwargs
        )
    
    def log_database_query(self, query_type: str, duration_ms: float, affected_rows: Optional[int] = None, **kwargs):
        """Log database query performance"""
        self.logger.debug(
            "Database query executed",
            query_type=query_type,
            duration_ms=duration_ms,
            affected_rows=affected_rows,
            **kwargs
        )
    
    def log_external_api_call(self, service: str, endpoint: str, duration_ms: float, status_code: int, **kwargs):
        """Log external API call performance"""
        self.logger.info(
            "External API call",
            external_service=service,
            endpoint=endpoint,
            duration_ms=duration_ms,
            status_code=status_code,
            **kwargs
        )


# Global logger instances
security_logger = SecurityLogger()
performance_logger = PerformanceLogger()


def get_logger(name: str = None) -> structlog.stdlib.BoundLogger:
    """
    Get a configured logger instance
    """
    return structlog.get_logger(name)


def get_security_logger() -> SecurityLogger:
    """
    Get the security logger instance
    """
    return security_logger


def get_performance_logger() -> PerformanceLogger:
    """
    Get the performance logger instance
    """
    return performance_logger