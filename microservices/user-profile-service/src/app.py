"""
User Profile Service - FastAPI + PostgreSQL
Handles Sellers, Buyers, Agents, KYC, onboarding data
"""

from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
import asyncpg
from datetime import datetime
import os
import uuid
import boto3
from botocore.exceptions import ClientError
import requests
from enum import Enum

app = FastAPI(title="User Profile Service", description="User Profile Management Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/msme_profiles")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "msme-documents")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")

# AWS S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name='us-east-1'
)

# Database connection
async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL)

# Authentication dependency
async def verify_token(authorization: str = None):
    """Verify JWT token with auth service"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split(" ")[1]
    
    try:
        response = requests.post(
            f"{AUTH_SERVICE_URL}/validate-token",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable"
        )

# Enums
class UserRole(str, Enum):
    SELLER = "seller"
    BUYER = "buyer"
    AGENT = "agent"
    NBFC = "nbfc"
    ADMIN = "admin"

class KYCStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"

class OnboardingStatus(str, Enum):
    INCOMPLETE = "incomplete"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"

# Pydantic models
class UserProfile(BaseModel):
    email: Optional[EmailStr] = None
    phone: str
    first_name: str
    last_name: str
    role: UserRole
    profile_image_url: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"
    
    # Role-specific fields
    company_name: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    annual_turnover: Optional[float] = None
    
    # Buyer-specific fields
    investment_capacity: Optional[float] = None
    preferred_industries: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    investment_timeline: Optional[str] = None
    
    # Agent-specific fields
    license_number: Optional[str] = None
    specializations: Optional[List[str]] = None
    commission_rate: Optional[float] = None
    
    # NBFC-specific fields
    nbfc_license: Optional[str] = None
    authorized_capital: Optional[float] = None
    net_worth: Optional[float] = None

class KYCDocument(BaseModel):
    document_type: str
    document_number: str
    document_url: str
    verification_status: KYCStatus = KYCStatus.PENDING
    uploaded_at: datetime = datetime.utcnow()

class OnboardingData(BaseModel):
    user_id: int
    step: str
    data: Dict[str, Any]
    status: OnboardingStatus = OnboardingStatus.INCOMPLETE
    completed_at: Optional[datetime] = None

class BankDetails(BaseModel):
    account_number: str
    ifsc_code: str
    bank_name: str
    branch_name: str
    account_holder_name: str
    account_type: str = "savings"

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    company_name: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    annual_turnover: Optional[float] = None
    investment_capacity: Optional[float] = None
    preferred_industries: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    investment_timeline: Optional[str] = None
    license_number: Optional[str] = None
    specializations: Optional[List[str]] = None
    commission_rate: Optional[float] = None
    nbfc_license: Optional[str] = None
    authorized_capital: Optional[float] = None
    net_worth: Optional[float] = None

# Helper functions
async def upload_to_s3(file: UploadFile, user_id: int, document_type: str) -> str:
    """Upload file to S3 and return URL"""
    try:
        file_extension = file.filename.split('.')[-1]
        key = f"users/{user_id}/documents/{document_type}_{uuid.uuid4()}.{file_extension}"
        
        s3_client.upload_fileobj(
            file.file,
            S3_BUCKET_NAME,
            key,
            ExtraArgs={'ContentType': file.content_type}
        )
        
        return f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{key}"
    except ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )

def format_user_profile(record: dict) -> dict:
    """Format database record to user profile"""
    return {
        "user_id": record["id"],
        "email": record["email"],
        "phone": record["phone"],
        "first_name": record["first_name"],
        "last_name": record["last_name"],
        "role": record["role"],
        "profile_image_url": record["profile_image_url"],
        "date_of_birth": record["date_of_birth"],
        "gender": record["gender"],
        "address": record["address"],
        "city": record["city"],
        "state": record["state"],
        "pincode": record["pincode"],
        "country": record["country"],
        "company_name": record["company_name"],
        "business_type": record["business_type"],
        "industry": record["industry"],
        "annual_turnover": float(record["annual_turnover"]) if record["annual_turnover"] else None,
        "investment_capacity": float(record["investment_capacity"]) if record["investment_capacity"] else None,
        "preferred_industries": record["preferred_industries"],
        "preferred_locations": record["preferred_locations"],
        "investment_timeline": record["investment_timeline"],
        "license_number": record["license_number"],
        "specializations": record["specializations"],
        "commission_rate": float(record["commission_rate"]) if record["commission_rate"] else None,
        "nbfc_license": record["nbfc_license"],
        "authorized_capital": float(record["authorized_capital"]) if record["authorized_capital"] else None,
        "net_worth": float(record["net_worth"]) if record["net_worth"] else None,
        "created_at": record["created_at"],
        "updated_at": record["updated_at"]
    }

# API Endpoints

@app.post("/profiles")
async def create_profile(
    profile: UserProfile,
    current_user: dict = Depends(verify_token)
):
    """Create user profile"""
    conn = await get_db_connection()
    
    try:
        profile_id = await conn.fetchval(
            """
            INSERT INTO user_profiles (
                user_id, email, phone, first_name, last_name, role,
                date_of_birth, gender, address, city, state, pincode, country,
                company_name, business_type, industry, annual_turnover,
                investment_capacity, preferred_industries, preferred_locations,
                investment_timeline, license_number, specializations,
                commission_rate, nbfc_license, authorized_capital, net_worth,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
                $25, $26, $27, $28, $29
            ) RETURNING id
            """,
            current_user["user_id"], profile.email, profile.phone,
            profile.first_name, profile.last_name, profile.role.value,
            profile.date_of_birth, profile.gender, profile.address,
            profile.city, profile.state, profile.pincode, profile.country,
            profile.company_name, profile.business_type, profile.industry,
            profile.annual_turnover, profile.investment_capacity,
            profile.preferred_industries, profile.preferred_locations,
            profile.investment_timeline, profile.license_number,
            profile.specializations, profile.commission_rate,
            profile.nbfc_license, profile.authorized_capital,
            profile.net_worth, datetime.utcnow(), datetime.utcnow()
        )
        
        return {
            "message": "Profile created successfully",
            "profile_id": profile_id,
            "user_id": current_user["user_id"]
        }
        
    finally:
        await conn.close()

@app.get("/profiles/{user_id}")
async def get_profile(
    user_id: int,
    current_user: dict = Depends(verify_token)
):
    """Get user profile by ID"""
    conn = await get_db_connection()
    
    try:
        profile = await conn.fetchrow(
            """
            SELECT * FROM user_profiles WHERE user_id = $1
            """,
            user_id
        )
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        return format_user_profile(profile)
        
    finally:
        await conn.close()

@app.put("/profiles/{user_id}")
async def update_profile(
    user_id: int,
    profile_update: ProfileUpdate,
    current_user: dict = Depends(verify_token)
):
    """Update user profile"""
    # Check if user can update this profile
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's profile"
        )
    
    conn = await get_db_connection()
    
    try:
        # Build update query dynamically
        update_fields = []
        values = []
        param_count = 1
        
        update_data = profile_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            update_fields.append(f"{field} = ${param_count}")
            values.append(value)
            param_count += 1
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_fields.append(f"updated_at = ${param_count}")
        values.append(datetime.utcnow())
        param_count += 1
        
        values.append(user_id)
        
        query = f"""
            UPDATE user_profiles 
            SET {', '.join(update_fields)}
            WHERE user_id = ${param_count}
            RETURNING *
        """
        
        updated_profile = await conn.fetchrow(query, *values)
        
        if not updated_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        return {
            "message": "Profile updated successfully",
            "profile": format_user_profile(updated_profile)
        }
        
    finally:
        await conn.close()

@app.post("/profiles/{user_id}/upload-document")
async def upload_document(
    user_id: int,
    document_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(verify_token)
):
    """Upload KYC document"""
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot upload documents for other users"
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and PDF allowed"
        )
    
    # Upload to S3
    document_url = await upload_to_s3(file, user_id, document_type)
    
    # Save to database
    conn = await get_db_connection()
    
    try:
        document_id = await conn.fetchval(
            """
            INSERT INTO kyc_documents (
                user_id, document_type, document_url, verification_status,
                uploaded_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            """,
            user_id, document_type, document_url, KYCStatus.PENDING.value,
            datetime.utcnow(), datetime.utcnow()
        )
        
        return {
            "message": "Document uploaded successfully",
            "document_id": document_id,
            "document_url": document_url
        }
        
    finally:
        await conn.close()

@app.get("/profiles/{user_id}/documents")
async def get_user_documents(
    user_id: int,
    current_user: dict = Depends(verify_token)
):
    """Get user's KYC documents"""
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's documents"
        )
    
    conn = await get_db_connection()
    
    try:
        documents = await conn.fetch(
            """
            SELECT * FROM kyc_documents 
            WHERE user_id = $1 
            ORDER BY uploaded_at DESC
            """,
            user_id
        )
        
        return [dict(doc) for doc in documents]
        
    finally:
        await conn.close()

@app.post("/profiles/{user_id}/kyc-verification")
async def update_kyc_status(
    user_id: int,
    document_id: int,
    status: KYCStatus,
    remarks: Optional[str] = None,
    current_user: dict = Depends(verify_token)
):
    """Update KYC verification status (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update KYC status"
        )
    
    conn = await get_db_connection()
    
    try:
        await conn.execute(
            """
            UPDATE kyc_documents 
            SET verification_status = $1, remarks = $2, verified_at = $3
            WHERE id = $4 AND user_id = $5
            """,
            status.value, remarks, datetime.utcnow(), document_id, user_id
        )
        
        # Update user's overall KYC status
        await conn.execute(
            """
            UPDATE user_profiles 
            SET kyc_status = $1, kyc_verified_at = $2
            WHERE user_id = $3
            """,
            status.value, datetime.utcnow(), user_id
        )
        
        return {"message": "KYC status updated successfully"}
        
    finally:
        await conn.close()

@app.post("/profiles/{user_id}/onboarding")
async def save_onboarding_data(
    user_id: int,
    step: str,
    data: Dict[str, Any],
    current_user: dict = Depends(verify_token)
):
    """Save onboarding progress"""
    if current_user["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot save onboarding data for other users"
        )
    
    conn = await get_db_connection()
    
    try:
        await conn.execute(
            """
            INSERT INTO onboarding_data (user_id, step, data, status, created_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, step) 
            DO UPDATE SET data = $3, status = $4, updated_at = $5
            """,
            user_id, step, data, OnboardingStatus.INCOMPLETE.value,
            datetime.utcnow()
        )
        
        return {"message": "Onboarding data saved successfully"}
        
    finally:
        await conn.close()

@app.get("/profiles/{user_id}/onboarding")
async def get_onboarding_progress(
    user_id: int,
    current_user: dict = Depends(verify_token)
):
    """Get user's onboarding progress"""
    if current_user["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's onboarding data"
        )
    
    conn = await get_db_connection()
    
    try:
        progress = await conn.fetch(
            """
            SELECT * FROM onboarding_data 
            WHERE user_id = $1 
            ORDER BY created_at
            """,
            user_id
        )
        
        return [dict(step) for step in progress]
        
    finally:
        await conn.close()

@app.post("/profiles/{user_id}/bank-details")
async def add_bank_details(
    user_id: int,
    bank_details: BankDetails,
    current_user: dict = Depends(verify_token)
):
    """Add bank account details"""
    if current_user["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot add bank details for other users"
        )
    
    conn = await get_db_connection()
    
    try:
        bank_id = await conn.fetchval(
            """
            INSERT INTO bank_details (
                user_id, account_number, ifsc_code, bank_name,
                branch_name, account_holder_name, account_type,
                is_primary, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
            """,
            user_id, bank_details.account_number, bank_details.ifsc_code,
            bank_details.bank_name, bank_details.branch_name,
            bank_details.account_holder_name, bank_details.account_type,
            True, datetime.utcnow()
        )
        
        return {
            "message": "Bank details added successfully",
            "bank_id": bank_id
        }
        
    finally:
        await conn.close()

@app.get("/profiles/{user_id}/bank-details")
async def get_bank_details(
    user_id: int,
    current_user: dict = Depends(verify_token)
):
    """Get user's bank details"""
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's bank details"
        )
    
    conn = await get_db_connection()
    
    try:
        bank_details = await conn.fetch(
            """
            SELECT * FROM bank_details 
            WHERE user_id = $1 
            ORDER BY created_at DESC
            """,
            user_id
        )
        
        return [dict(bank) for bank in bank_details]
        
    finally:
        await conn.close()

@app.get("/profiles/search")
async def search_profiles(
    role: Optional[UserRole] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    industry: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(verify_token)
):
    """Search user profiles with filters"""
    conn = await get_db_connection()
    
    try:
        # Build query dynamically
        conditions = []
        params = []
        param_count = 1
        
        if role:
            conditions.append(f"role = ${param_count}")
            params.append(role.value)
            param_count += 1
        
        if city:
            conditions.append(f"city ILIKE ${param_count}")
            params.append(f"%{city}%")
            param_count += 1
        
        if state:
            conditions.append(f"state ILIKE ${param_count}")
            params.append(f"%{state}%")
            param_count += 1
        
        if industry:
            conditions.append(f"industry ILIKE ${param_count}")
            params.append(f"%{industry}%")
            param_count += 1
        
        where_clause = " AND ".join(conditions) if conditions else "TRUE"
        
        query = f"""
            SELECT * FROM user_profiles 
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_count} OFFSET ${param_count + 1}
        """
        
        params.extend([limit, offset])
        
        profiles = await conn.fetch(query, *params)
        
        return [format_user_profile(profile) for profile in profiles]
        
    finally:
        await conn.close()

@app.get("/profiles/{user_id}/profile-completion")
async def get_profile_completion(
    user_id: int,
    current_user: dict = Depends(verify_token)
):
    """Get profile completion percentage"""
    if current_user["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's profile completion"
        )
    
    conn = await get_db_connection()
    
    try:
        profile = await conn.fetchrow(
            "SELECT * FROM user_profiles WHERE user_id = $1",
            user_id
        )
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        # Calculate completion percentage
        total_fields = 0
        completed_fields = 0
        
        required_fields = [
            'first_name', 'last_name', 'email', 'phone',
            'address', 'city', 'state', 'pincode'
        ]
        
        role_specific_fields = {
            'seller': ['company_name', 'business_type', 'industry', 'annual_turnover'],
            'buyer': ['investment_capacity', 'preferred_industries', 'preferred_locations'],
            'agent': ['license_number', 'specializations', 'commission_rate'],
            'nbfc': ['nbfc_license', 'authorized_capital', 'net_worth']
        }
        
        all_fields = required_fields + role_specific_fields.get(profile['role'], [])
        
        for field in all_fields:
            total_fields += 1
            if profile.get(field):
                completed_fields += 1
        
        completion_percentage = (completed_fields / total_fields) * 100 if total_fields > 0 else 0
        
        return {
            "completion_percentage": round(completion_percentage, 2),
            "completed_fields": completed_fields,
            "total_fields": total_fields,
            "missing_fields": [field for field in all_fields if not profile.get(field)]
        }
        
    finally:
        await conn.close()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        conn = await get_db_connection()
        await conn.fetchval("SELECT 1")
        await conn.close()
        
        return {
            "status": "healthy",
            "service": "user-profile-service",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)