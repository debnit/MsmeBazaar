"""
Centralized Logging Configuration for MSMEBazaar Platform
Provides structured logging, error tracking, and monitoring integration
"""

import logging
import sys
import json
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
import os
from pathlib import Path

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "service": os.getenv("SERVICE_NAME", "unknown"),
            "environment": os.getenv("NODE_ENV", "development")
        }
        
        # Add extra fields if present
        if hasattr(record, 'user_id'):
            log_entry["user_id"] = record.user_id
        if hasattr(record, 'request_id'):
            log_entry["request_id"] = record.request_id
        if hasattr(record, 'ip_address'):
            log_entry["ip_address"] = record.ip_address
            
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info)
            }
            
        return json.dumps(log_entry, default=str)

class MSMELogger:
    """Centralized logger for MSME platform"""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging configuration"""
        # Clear existing handlers
        self.logger.handlers.clear()
        
        # Set log level
        log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self.logger.setLevel(getattr(logging, log_level))
        
        # Console handler with JSON formatting
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(JSONFormatter())
        self.logger.addHandler(console_handler)
        
        # File handler for persistent logs
        log_dir = Path("/app/logs")
        log_dir.mkdir(exist_ok=True)
        
        file_handler = logging.FileHandler(
            log_dir / f"{self.service_name}.log", 
            encoding='utf-8'
        )
        file_handler.setFormatter(JSONFormatter())
        self.logger.addHandler(file_handler)
        
        # Error file handler
        error_handler = logging.FileHandler(
            log_dir / f"{self.service_name}_errors.log", 
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(JSONFormatter())
        self.logger.addHandler(error_handler)
        
        # Prevent propagation to root logger
        self.logger.propagate = False
    
    def info(self, message: str, **kwargs):
        """Log info message"""
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message"""
        self._log(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message"""
        self._log(logging.CRITICAL, message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self._log(logging.DEBUG, message, **kwargs)
    
    def _log(self, level: int, message: str, **kwargs):
        """Internal logging method"""
        extra = {}
        for key, value in kwargs.items():
            extra[key] = value
        
        self.logger.log(level, message, extra=extra)
    
    def log_request(self, method: str, path: str, status_code: int, 
                   duration: float, user_id: Optional[str] = None, 
                   ip_address: Optional[str] = None, request_id: Optional[str] = None):
        """Log HTTP request"""
        self.info(
            f"{method} {path} - {status_code} - {duration:.4f}s",
            user_id=user_id,
            ip_address=ip_address,
            request_id=request_id,
            method=method,
            path=path,
            status_code=status_code,
            duration=duration
        )
    
    def log_database_operation(self, operation: str, table: str, 
                              duration: float, success: bool = True, 
                              error: Optional[str] = None):
        """Log database operation"""
        level = logging.INFO if success else logging.ERROR
        message = f"DB {operation} on {table} - {duration:.4f}s"
        if not success and error:
            message += f" - Error: {error}"
        
        self._log(level, message, 
                 operation=operation, 
                 table=table, 
                 duration=duration, 
                 success=success,
                 error=error)
    
    def log_business_event(self, event_type: str, details: Dict[str, Any]):
        """Log business events for analytics"""
        self.info(
            f"Business Event: {event_type}",
            event_type=event_type,
            **details
        )
    
    def log_security_event(self, event_type: str, user_id: Optional[str] = None, 
                          ip_address: Optional[str] = None, details: Optional[Dict] = None):
        """Log security events"""
        self.warning(
            f"Security Event: {event_type}",
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            **(details or {})
        )

# Service-specific loggers
def get_logger(service_name: str) -> MSMELogger:
    """Get logger for specific service"""
    return MSMELogger(service_name)

# Pre-configured loggers for common services
auth_logger = get_logger("auth-service")
api_logger = get_logger("api-service")
valuation_logger = get_logger("valuation-service")
database_logger = get_logger("database")
ml_logger = get_logger("ml-service")