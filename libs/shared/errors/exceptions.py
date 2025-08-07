"""
Shared exception handling utilities for MSMEBazaar V2.0
Provides standardized error handling across all microservices.
"""

#from libs.errors.exception import raise_user_not_found
# or
#from libs.errors import raise_user_not_found


import traceback
from typing import Any, Dict, Optional, Union
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
import logging
import uuid
from datetime import datetime
from enum import Enum

# Configure logger
logger = logging.getLogger(__name__)


class ErrorCode(str, Enum):
    """Standardized error codes for the application"""
    
    # Authentication & Authorization
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # Validation Errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    
    # Business Logic Errors
    USER_NOT_FOUND = "USER_NOT_FOUND"
    USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS"
    MSME_PROFILE_NOT_FOUND = "MSME_PROFILE_NOT_FOUND"
    INVALID_OTP = "INVALID_OTP"
    OTP_EXPIRED = "OTP_EXPIRED"
    OTP_ALREADY_USED = "OTP_ALREADY_USED"
    
    # Payment Errors
    PAYMENT_FAILED = "PAYMENT_FAILED"
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"
    PAYMENT_GATEWAY_ERROR = "PAYMENT_GATEWAY_ERROR"
    
    # File Upload Errors
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    UPLOAD_FAILED = "UPLOAD_FAILED"
    
    # External Service Errors
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    TWILIO_ERROR = "TWILIO_ERROR"
    OPENAI_ERROR = "OPENAI_ERROR"
    RAZORPAY_ERROR = "RAZORPAY_ERROR"
    
    # Database Errors
    DATABASE_ERROR = "DATABASE_ERROR"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    FOREIGN_KEY_CONSTRAINT = "FOREIGN_KEY_CONSTRAINT"
    
    # Rate Limiting
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # System Errors
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"


class MSMEBazaarException(Exception):
    """Base exception class for MSMEBazaar application"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        self.request_id = request_id or str(uuid.uuid4())
        self.timestamp = datetime.utcnow()
        
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API response"""
        return {
            "success": False,
            "message": self.message,
            "error_code": self.error_code.value,
            "details": self.details,
            "request_id": self.request_id,
            "timestamp": self.timestamp.isoformat()
        }


class ValidationException(MSMEBazaarException):
    """Exception for validation errors"""
    
    def __init__(
        self,
        message: str = "Validation failed",
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        validation_details = details or {}
        if field:
            validation_details["field"] = field
        
        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=validation_details
        )


class AuthenticationException(MSMEBazaarException):
    """Exception for authentication errors"""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        error_code: ErrorCode = ErrorCode.UNAUTHORIZED,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )


class AuthorizationException(MSMEBazaarException):
    """Exception for authorization errors"""
    
    def __init__(
        self,
        message: str = "Access forbidden",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.FORBIDDEN,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )


class BusinessLogicException(MSMEBazaarException):
    """Exception for business logic errors"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class ExternalServiceException(MSMEBazaarException):
    """Exception for external service errors"""
    
    def __init__(
        self,
        message: str,
        service_name: str,
        error_code: ErrorCode = ErrorCode.EXTERNAL_SERVICE_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        service_details = details or {}
        service_details["service"] = service_name
        
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=service_details
        )


class DatabaseException(MSMEBazaarException):
    """Exception for database errors"""
    
    def __init__(
        self,
        message: str = "Database operation failed",
        error_code: ErrorCode = ErrorCode.DATABASE_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


class RateLimitException(MSMEBazaarException):
    """Exception for rate limiting errors"""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: int = 60,
        details: Optional[Dict[str, Any]] = None
    ):
        rate_limit_details = details or {}
        rate_limit_details["retry_after"] = retry_after
        
        super().__init__(
            message=message,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=rate_limit_details
        )


class FileUploadException(MSMEBazaarException):
    """Exception for file upload errors"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.UPLOAD_FAILED,
        filename: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        upload_details = details or {}
        if filename:
            upload_details["filename"] = filename
        
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=upload_details
        )


def create_error_response(
    message: str,
    error_code: ErrorCode,
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """Create a standardized error response"""
    
    error_response = {
        "success": False,
        "message": message,
        "error_code": error_code.value,
        "details": details or {},
        "request_id": request_id or str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat()
    }
    
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )


def handle_validation_error(exc: ValidationError) -> JSONResponse:
    """Handle Pydantic validation errors"""
    
    errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(x) for x in error["loc"])
        errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"]
        })
    
    return create_error_response(
        message="Validation failed",
        error_code=ErrorCode.VALIDATION_ERROR,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details={"validation_errors": errors}
    )


def handle_http_exception(exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions"""
    
    # Map HTTP status codes to error codes
    status_to_error_code = {
        status.HTTP_401_UNAUTHORIZED: ErrorCode.UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ErrorCode.FORBIDDEN,
        status.HTTP_404_NOT_FOUND: ErrorCode.USER_NOT_FOUND,
        status.HTTP_429_TOO_MANY_REQUESTS: ErrorCode.RATE_LIMIT_EXCEEDED,
        status.HTTP_500_INTERNAL_SERVER_ERROR: ErrorCode.INTERNAL_SERVER_ERROR,
        status.HTTP_502_BAD_GATEWAY: ErrorCode.EXTERNAL_SERVICE_ERROR,
        status.HTTP_503_SERVICE_UNAVAILABLE: ErrorCode.SERVICE_UNAVAILABLE,
    }
    
    error_code = status_to_error_code.get(exc.status_code, ErrorCode.INTERNAL_SERVER_ERROR)
    
    return create_error_response(
        message=str(exc.detail),
        error_code=error_code,
        status_code=exc.status_code,
        details={"original_detail": exc.detail}
    )


def handle_generic_exception(exc: Exception) -> JSONResponse:
    """Handle generic exceptions"""
    
    # Log the full traceback for debugging
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return create_error_response(
        message="An unexpected error occurred",
        error_code=ErrorCode.INTERNAL_SERVER_ERROR,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        details={
            "exception_type": type(exc).__name__,
            "exception_message": str(exc)
        }
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler for FastAPI applications"""
    
    # Add request ID to the request state if not present
    if not hasattr(request.state, "request_id"):
        request.state.request_id = str(uuid.uuid4())
    
    # Handle different types of exceptions
    if isinstance(exc, MSMEBazaarException):
        exc.request_id = request.state.request_id
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict()
        )
    
    elif isinstance(exc, ValidationError):
        return handle_validation_error(exc)
    
    elif isinstance(exc, HTTPException):
        return handle_http_exception(exc)
    
    else:
        return handle_generic_exception(exc)


def setup_exception_handlers(app):
    """Setup exception handlers for a FastAPI application"""
    
    @app.exception_handler(MSMEBazaarException)
    async def msmebazaar_exception_handler(request: Request, exc: MSMEBazaarException):
        return await global_exception_handler(request, exc)
    
    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc: ValidationError):
        return await global_exception_handler(request, exc)
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return await global_exception_handler(request, exc)
    
    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return await global_exception_handler(request, exc)


# Utility functions for common exceptions
def raise_user_not_found(user_id: str = None, phone: str = None):
    """Raise user not found exception"""
    details = {}
    if user_id:
        details["user_id"] = user_id
    if phone:
        details["phone"] = phone
    
    raise BusinessLogicException(
        message="User not found",
        error_code=ErrorCode.USER_NOT_FOUND,
        details=details
    )


def raise_invalid_otp(phone: str):
    """Raise invalid OTP exception"""
    raise BusinessLogicException(
        message="Invalid or expired OTP",
        error_code=ErrorCode.INVALID_OTP,
        details={"phone": phone}
    )


def raise_unauthorized(message: str = "Authentication required"):
    """Raise unauthorized exception"""
    raise AuthenticationException(
        message=message,
        error_code=ErrorCode.UNAUTHORIZED
    )


def raise_forbidden(message: str = "Access forbidden"):
    """Raise forbidden exception"""
    raise AuthorizationException(message=message)


def raise_validation_error(message: str, field: str = None):
    """Raise validation error exception"""
    raise ValidationException(
        message=message,
        field=field
    )


def raise_rate_limit_exceeded(retry_after: int = 60):
    """Raise rate limit exceeded exception"""
    raise RateLimitException(
        message="Too many requests. Please try again later.",
        retry_after=retry_after
    )


def raise_external_service_error(service_name: str, message: str):
    """Raise external service error exception"""
    raise ExternalServiceException(
        message=f"{service_name} service error: {message}",
        service_name=service_name
    )


def raise_database_error(message: str = "Database operation failed"):
    """Raise database error exception"""
    raise DatabaseException(message=message)


def raise_file_upload_error(message: str, filename: str = None):
    """Raise file upload error exception"""
    raise FileUploadException(
        message=message,
        filename=filename
    )