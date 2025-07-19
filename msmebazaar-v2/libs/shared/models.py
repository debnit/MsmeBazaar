"""
Shared response models for MSMEBazaar V2.0 APIs
Provides type-safe, validated response models for all microservices.
"""

from typing import Any, Dict, List, Optional, Union, Generic, TypeVar
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
import uuid

# Generic type for data responses
T = TypeVar('T')


class StatusEnum(str, Enum):
    """Standard status enumeration for responses"""
    SUCCESS = "success"
    ERROR = "error"
    PENDING = "pending"
    PROCESSING = "processing"


class UserRole(str, Enum):
    """User role enumeration"""
    MSME = "MSME"
    BUYER = "BUYER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class OTPPurpose(str, Enum):
    """OTP purpose enumeration"""
    REGISTRATION = "REGISTRATION"
    LOGIN = "LOGIN"
    PASSWORD_RESET = "PASSWORD_RESET"
    PHONE_VERIFICATION = "PHONE_VERIFICATION"


class KYCStatus(str, Enum):
    """KYC verification status"""
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class ValuationStatus(str, Enum):
    """Valuation request status"""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class PaymentStatus(str, Enum):
    """Payment status enumeration"""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


# ==========================================
# Base Response Models
# ==========================================

class BaseResponse(BaseModel):
    """Base response model for all API responses"""
    
    success: bool = Field(..., description="Whether the request was successful")
    message: str = Field(..., description="Human-readable message describing the result")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    request_id: Optional[str] = Field(None, description="Unique request identifier for tracking")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DataResponse(BaseResponse, Generic[T]):
    """Generic data response model"""
    
    data: T = Field(..., description="Response data")


class ListResponse(BaseResponse, Generic[T]):
    """Generic list response model with pagination"""
    
    data: List[T] = Field(..., description="List of items")
    pagination: Optional['PaginationInfo'] = Field(None, description="Pagination information")


class ErrorResponse(BaseResponse):
    """Error response model"""
    
    success: bool = Field(False, description="Always false for error responses")
    error_code: Optional[str] = Field(None, description="Machine-readable error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    
    class Config:
        schema_extra = {
            "example": {
                "success": False,
                "message": "Validation error",
                "error_code": "VALIDATION_ERROR",
                "details": {"field": "email", "issue": "Invalid format"},
                "timestamp": "2024-01-01T12:00:00Z"
            }
        }


class PaginationInfo(BaseModel):
    """Pagination information model"""
    
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, le=100, description="Number of items per page")
    total_items: int = Field(..., ge=0, description="Total number of items")
    total_pages: int = Field(..., ge=0, description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_previous: bool = Field(..., description="Whether there are previous pages")


# ==========================================
# User & Authentication Models
# ==========================================

class UserProfile(BaseModel):
    """User profile model"""
    
    id: str = Field(..., description="User unique identifier")
    phone: str = Field(..., description="User phone number")
    name: Optional[str] = Field(None, description="User full name")
    email: Optional[str] = Field(None, description="User email address")
    role: UserRole = Field(..., description="User role")
    is_verified: bool = Field(False, description="Whether user is verified")
    created_at: datetime = Field(..., description="User creation timestamp")
    updated_at: datetime = Field(..., description="User last update timestamp")
    
    class Config:
        schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "phone": "+919876543210",
                "name": "John Doe",
                "email": "john@example.com",
                "role": "MSME",
                "is_verified": True,
                "created_at": "2024-01-01T12:00:00Z",
                "updated_at": "2024-01-01T12:00:00Z"
            }
        }


class TokenResponse(BaseResponse):
    """Authentication token response"""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user: UserProfile = Field(..., description="User profile information")


class OTPResponse(BaseResponse):
    """OTP response model"""
    
    otp_sent: bool = Field(..., description="Whether OTP was sent successfully")
    expires_at: datetime = Field(..., description="OTP expiration time")
    retry_after: int = Field(..., description="Seconds to wait before requesting new OTP")


# ==========================================
# MSME Profile Models
# ==========================================

class MSMEProfile(BaseModel):
    """MSME profile model"""
    
    id: str = Field(..., description="Profile unique identifier")
    user_id: str = Field(..., description="Associated user ID")
    business_name: str = Field(..., description="Business name")
    sector: str = Field(..., description="Business sector")
    pincode: str = Field(..., description="Business location pincode")
    description: Optional[str] = Field(None, description="Business description")
    annual_revenue: Optional[float] = Field(None, description="Annual revenue in INR")
    employee_count: Optional[int] = Field(None, description="Number of employees")
    established_year: Optional[int] = Field(None, description="Year of establishment")
    website: Optional[str] = Field(None, description="Business website")
    contact_email: Optional[str] = Field(None, description="Business contact email")
    kyc_status: KYCStatus = Field(KYCStatus.PENDING, description="KYC verification status")
    is_active: bool = Field(True, description="Whether profile is active")
    created_at: datetime = Field(..., description="Profile creation timestamp")
    updated_at: datetime = Field(..., description="Profile last update timestamp")
    
    @validator('annual_revenue')
    def validate_revenue(cls, v):
        if v is not None and v < 0:
            raise ValueError('Annual revenue cannot be negative')
        return v
    
    @validator('employee_count')
    def validate_employee_count(cls, v):
        if v is not None and v < 0:
            raise ValueError('Employee count cannot be negative')
        return v
    
    @validator('established_year')
    def validate_established_year(cls, v):
        if v is not None and (v < 1800 or v > datetime.now().year):
            raise ValueError('Invalid establishment year')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "business_name": "Tech Solutions Pvt Ltd",
                "sector": "Technology",
                "pincode": "400001",
                "description": "AI-powered software solutions",
                "annual_revenue": 5000000,
                "employee_count": 25,
                "established_year": 2020,
                "website": "https://techsolutions.com",
                "contact_email": "contact@techsolutions.com",
                "kyc_status": "APPROVED",
                "is_active": True,
                "created_at": "2024-01-01T12:00:00Z",
                "updated_at": "2024-01-01T12:00:00Z"
            }
        }


class DocumentInfo(BaseModel):
    """Document information model"""
    
    id: str = Field(..., description="Document unique identifier")
    name: str = Field(..., description="Document name")
    type: str = Field(..., description="Document type")
    size: int = Field(..., description="Document size in bytes")
    url: str = Field(..., description="Document download URL")
    uploaded_at: datetime = Field(..., description="Upload timestamp")
    verified: bool = Field(False, description="Whether document is verified")


# ==========================================
# Matching Models
# ==========================================

class BuyerPreferences(BaseModel):
    """Buyer preferences for matching"""
    
    sectors: List[str] = Field(..., description="Preferred business sectors")
    location: Optional[str] = Field(None, description="Preferred location")
    revenue_range: Optional[Dict[str, float]] = Field(None, description="Revenue range preference")
    employee_range: Optional[Dict[str, int]] = Field(None, description="Employee count range")
    requirements: Optional[str] = Field(None, description="Additional requirements")
    
    @validator('revenue_range')
    def validate_revenue_range(cls, v):
        if v and 'min' in v and 'max' in v and v['min'] > v['max']:
            raise ValueError('Minimum revenue cannot be greater than maximum')
        return v
    
    @validator('employee_range')
    def validate_employee_range(cls, v):
        if v and 'min' in v and 'max' in v and v['min'] > v['max']:
            raise ValueError('Minimum employee count cannot be greater than maximum')
        return v


class MatchResult(BaseModel):
    """Match result model"""
    
    msme_profile: MSMEProfile = Field(..., description="Matched MSME profile")
    similarity_score: float = Field(..., description="Similarity score (0-1)")
    match_reasons: List[str] = Field(..., description="Reasons for the match")
    
    @validator('similarity_score')
    def validate_similarity_score(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Similarity score must be between 0 and 1')
        return v


class MatchResponse(BaseResponse):
    """Match response model"""
    
    matches: List[MatchResult] = Field(..., description="List of matched MSMEs")
    total_matches: int = Field(..., description="Total number of matches found")
    query_embedding: Optional[List[float]] = Field(None, description="Query embedding vector")


# ==========================================
# Valuation Models
# ==========================================

class ValuationRequest(BaseModel):
    """Valuation request model"""
    
    id: str = Field(..., description="Valuation request unique identifier")
    msme_profile_id: str = Field(..., description="Associated MSME profile ID")
    package_type: str = Field(..., description="Valuation package type")
    status: ValuationStatus = Field(..., description="Valuation status")
    amount: float = Field(..., description="Valuation amount in INR")
    payment_status: PaymentStatus = Field(..., description="Payment status")
    created_at: datetime = Field(..., description="Request creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    
    class Config:
        schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "msme_profile_id": "123e4567-e89b-12d3-a456-426614174001",
                "package_type": "premium",
                "status": "COMPLETED",
                "amount": 499.0,
                "payment_status": "SUCCESS",
                "created_at": "2024-01-01T12:00:00Z",
                "completed_at": "2024-01-01T14:00:00Z"
            }
        }


class ValuationResult(BaseModel):
    """Valuation result model"""
    
    estimated_value: float = Field(..., description="Estimated business value in INR")
    confidence_score: float = Field(..., description="Confidence score (0-1)")
    methodology: str = Field(..., description="Valuation methodology used")
    factors: List[Dict[str, Any]] = Field(..., description="Valuation factors considered")
    recommendations: List[str] = Field(..., description="Recommendations for improvement")
    pdf_url: Optional[str] = Field(None, description="PDF report download URL")
    
    @validator('confidence_score')
    def validate_confidence_score(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Confidence score must be between 0 and 1')
        return v


class ValuationResponse(BaseResponse):
    """Valuation response model"""
    
    request: ValuationRequest = Field(..., description="Valuation request details")
    result: Optional[ValuationResult] = Field(None, description="Valuation result (if completed)")


# ==========================================
# Payment Models
# ==========================================

class PaymentRequest(BaseModel):
    """Payment request model"""
    
    amount: float = Field(..., description="Payment amount in INR")
    currency: str = Field("INR", description="Payment currency")
    description: str = Field(..., description="Payment description")
    customer_email: str = Field(..., description="Customer email")
    customer_phone: str = Field(..., description="Customer phone")
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Payment amount must be positive')
        return v


class PaymentResponse(BaseResponse):
    """Payment response model"""
    
    payment_id: str = Field(..., description="Payment unique identifier")
    order_id: str = Field(..., description="Order identifier")
    amount: float = Field(..., description="Payment amount")
    currency: str = Field(..., description="Payment currency")
    status: PaymentStatus = Field(..., description="Payment status")
    payment_url: Optional[str] = Field(None, description="Payment gateway URL")
    created_at: datetime = Field(..., description="Payment creation timestamp")


# ==========================================
# Admin Models
# ==========================================

class AdminStats(BaseModel):
    """Admin dashboard statistics"""
    
    total_users: int = Field(..., description="Total registered users")
    total_msmes: int = Field(..., description="Total MSME profiles")
    pending_kyc: int = Field(..., description="Pending KYC verifications")
    active_valuations: int = Field(..., description="Active valuation requests")
    revenue_today: float = Field(..., description="Revenue generated today")
    revenue_month: float = Field(..., description="Revenue generated this month")
    
    class Config:
        schema_extra = {
            "example": {
                "total_users": 1500,
                "total_msmes": 1200,
                "pending_kyc": 45,
                "active_valuations": 23,
                "revenue_today": 15000.0,
                "revenue_month": 450000.0
            }
        }


class KYCVerificationRequest(BaseModel):
    """KYC verification request model"""
    
    id: str = Field(..., description="KYC request unique identifier")
    msme_profile_id: str = Field(..., description="Associated MSME profile ID")
    business_name: str = Field(..., description="Business name")
    documents: List[DocumentInfo] = Field(..., description="Submitted documents")
    status: KYCStatus = Field(..., description="KYC verification status")
    submitted_at: datetime = Field(..., description="Submission timestamp")
    reviewed_at: Optional[datetime] = Field(None, description="Review timestamp")
    reviewer_notes: Optional[str] = Field(None, description="Reviewer notes")


class AdminActionRequest(BaseModel):
    """Admin action request model"""
    
    action: str = Field(..., description="Action to perform")
    target_id: str = Field(..., description="Target entity ID")
    reason: Optional[str] = Field(None, description="Reason for action")
    notes: Optional[str] = Field(None, description="Additional notes")


class AdminActionResponse(BaseResponse):
    """Admin action response model"""
    
    action_id: str = Field(..., description="Action unique identifier")
    action: str = Field(..., description="Action performed")
    target_id: str = Field(..., description="Target entity ID")
    performed_by: str = Field(..., description="Admin user ID")
    performed_at: datetime = Field(..., description="Action timestamp")


# ==========================================
# Health Check Models
# ==========================================

class ServiceHealth(BaseModel):
    """Individual service health status"""
    
    service: str = Field(..., description="Service name")
    status: str = Field(..., description="Service status")
    response_time: float = Field(..., description="Response time in seconds")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional health details")


class HealthCheckResponse(BaseResponse):
    """Health check response model"""
    
    status: str = Field(..., description="Overall system status")
    services: List[ServiceHealth] = Field(..., description="Individual service statuses")
    uptime: float = Field(..., description="System uptime in seconds")
    version: str = Field(..., description="API version")


# ==========================================
# Webhook Models
# ==========================================

class WebhookEvent(BaseModel):
    """Webhook event model"""
    
    event_id: str = Field(..., description="Event unique identifier")
    event_type: str = Field(..., description="Event type")
    timestamp: datetime = Field(..., description="Event timestamp")
    data: Dict[str, Any] = Field(..., description="Event data")
    source: str = Field(..., description="Event source")


class WebhookResponse(BaseResponse):
    """Webhook response model"""
    
    event_id: str = Field(..., description="Event unique identifier")
    processed: bool = Field(..., description="Whether event was processed")
    processing_time: float = Field(..., description="Processing time in seconds")


# Update forward references
PaginationInfo.update_forward_refs()
ListResponse.update_forward_refs()