from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class Role(str, Enum):
    MSME = "MSME"
    BUYER = "BUYER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"

class OTPPurpose(str, Enum):
    REGISTRATION = "REGISTRATION"
    LOGIN = "LOGIN"
    PASSWORD_RESET = "PASSWORD_RESET"
    PHONE_VERIFICATION = "PHONE_VERIFICATION"

# Request Models
class RegisterRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    name: Optional[str] = Field(None, description="User's full name")
    email: Optional[str] = Field(None, description="User's email address")
    role: Role = Field(Role.MSME, description="User role")
    
    @validator('phone')
    def validate_phone(cls, v):
        # Remove all non-digit characters
        phone = ''.join(filter(str.isdigit, v))
        
        # Add country code if not present
        if not phone.startswith('91') and len(phone) == 10:
            phone = '91' + phone
        
        # Validate Indian mobile number format
        if not (phone.startswith('91') and len(phone) == 12):
            raise ValueError('Invalid phone number format')
        
        return '+' + phone
    
    @validator('email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v

class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    otp: str = Field(..., min_length=4, max_length=6, description="OTP code")
    purpose: OTPPurpose = Field(..., description="Purpose of OTP verification")
    
    @validator('phone')
    def validate_phone(cls, v):
        phone = ''.join(filter(str.isdigit, v))
        if not phone.startswith('91') and len(phone) == 10:
            phone = '91' + phone
        if not (phone.startswith('91') and len(phone) == 12):
            raise ValueError('Invalid phone number format')
        return '+' + phone

class LoginRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    
    @validator('phone')
    def validate_phone(cls, v):
        phone = ''.join(filter(str.isdigit, v))
        if not phone.startswith('91') and len(phone) == 10:
            phone = '91' + phone
        if not (phone.startswith('91') and len(phone) == 12):
            raise ValueError('Invalid phone number format')
        return '+' + phone

class ResendOTPRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    purpose: OTPPurpose = Field(..., description="Purpose of OTP")
    
    @validator('phone')
    def validate_phone(cls, v):
        phone = ''.join(filter(str.isdigit, v))
        if not phone.startswith('91') and len(phone) == 10:
            phone = '91' + phone
        if not (phone.startswith('91') and len(phone) == 12):
            raise ValueError('Invalid phone number format')
        return '+' + phone

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token")

# Response Models
class UserResponse(BaseModel):
    id: str
    phone: str
    email: Optional[str]
    name: Optional[str]
    role: Role
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class OTPResponse(BaseModel):
    success: bool
    message: str
    expires_in: int
    can_resend_in: Optional[int] = None

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    database: str
    redis: str

# Internal Models
class UserCreate(BaseModel):
    phone: str
    email: Optional[str] = None
    name: Optional[str] = None
    role: Role = Role.MSME

class OTPCreate(BaseModel):
    user_id: str
    code: str
    purpose: OTPPurpose
    expires_at: datetime

class SessionCreate(BaseModel):
    user_id: str
    token: str
    expires_at: datetime