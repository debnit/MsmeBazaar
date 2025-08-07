from libs.db.session import get_db
"""
MSME Listing Service - FastAPI + PostgreSQL + S3
Handles MSME registration, asset info, financials, tags
"""

from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import asyncpg
from datetime import datetime
import os
import uuid
import boto3
from botocore.exceptions import ClientError
import requests
from enum import Enum
from decimal import Decimal
import json

app = FastAPI(title="MSME Listing Service", description="MSME Business Listing Management")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/msme_listings")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "msme-listings")
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
class ListingStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SOLD = "sold"
    REJECTED = "rejected"

class BusinessType(str, Enum):
    MANUFACTURING = "manufacturing"
    TRADING = "trading"
    SERVICES = "services"
    RETAIL = "retail"
    AGRICULTURE = "agriculture"
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    HOSPITALITY = "hospitality"
    TRANSPORTATION = "transportation"

class AssetType(str, Enum):
    MACHINERY = "machinery"
    EQUIPMENT = "equipment"
    INVENTORY = "inventory"
    FURNITURE = "furniture"
    VEHICLE = "vehicle"
    REAL_ESTATE = "real_estate"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    OTHER = "other"

# Pydantic models
class FinancialData(BaseModel):
    annual_revenue: Optional[float] = None
    annual_profit: Optional[float] = None
    total_assets: Optional[float] = None
    current_assets: Optional[float] = None
    current_liabilities: Optional[float] = None
    total_debt: Optional[float] = None
    equity: Optional[float] = None
    ebitda: Optional[float] = None
    cash_flow: Optional[float] = None
    working_capital: Optional[float] = None
    roi: Optional[float] = None
    gross_margin: Optional[float] = None
    net_margin: Optional[float] = None
    debt_equity_ratio: Optional[float] = None
    current_ratio: Optional[float] = None
    quick_ratio: Optional[float] = None
    asset_turnover: Optional[float] = None
    inventory_turnover: Optional[float] = None

class Asset(BaseModel):
    asset_type: AssetType
    name: str
    description: Optional[str] = None
    value: float
    acquisition_date: Optional[datetime] = None
    depreciation_rate: Optional[float] = None
    current_condition: Optional[str] = None
    location: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None

class MarketingInfo(BaseModel):
    unique_selling_points: List[str] = []
    target_market: Optional[str] = None
    market_share: Optional[float] = None
    competition_level: Optional[str] = None
    growth_potential: Optional[str] = None
    seasonal_trends: Optional[str] = None
    customer_base: Optional[str] = None
    marketing_channels: List[str] = []

class OperationalData(BaseModel):
    employee_count: Optional[int] = None
    key_employees: List[str] = []
    operational_model: Optional[str] = None
    supply_chain: Optional[str] = None
    key_customers: List[str] = []
    key_suppliers: List[str] = []
    licenses_permits: List[str] = []
    certifications: List[str] = []
    technology_stack: List[str] = []

class MSMEListing(BaseModel):
    company_name: str
    business_type: BusinessType
    industry: str
    sub_industry: Optional[str] = None
    description: str
    establishment_year: int
    registration_number: Optional[str] = None
    
    # Location
    address: str
    city: str
    state: str
    pincode: str
    country: str = "India"
    
    # Pricing
    asking_price: float
    negotiable: bool = True
    price_justification: Optional[str] = None
    
    # Contact
    primary_contact_name: str
    primary_contact_phone: str
    primary_contact_email: str
    
    # Data
    financial_data: FinancialData
    assets: List[Asset] = []
    marketing_info: MarketingInfo
    operational_data: OperationalData
    
    # Tags and categorization
    tags: List[str] = []
    keywords: List[str] = []
    
    # Media
    featured_image_url: Optional[str] = None
    gallery_images: List[str] = []
    documents: List[str] = []
    
    # Status
    status: ListingStatus = ListingStatus.DRAFT
    
    @validator('establishment_year')
    def validate_establishment_year(cls, v):
        current_year = datetime.now().year
        if v < 1800 or v > current_year:
            raise ValueError('Invalid establishment year')
        return v

class ListingUpdate(BaseModel):
    company_name: Optional[str] = None
    business_type: Optional[BusinessType] = None
    industry: Optional[str] = None
    sub_industry: Optional[str] = None
    description: Optional[str] = None
    establishment_year: Optional[int] = None
    registration_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    asking_price: Optional[float] = None
    negotiable: Optional[bool] = None
    price_justification: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    primary_contact_email: Optional[str] = None
    financial_data: Optional[FinancialData] = None
    assets: Optional[List[Asset]] = None
    marketing_info: Optional[MarketingInfo] = None
    operational_data: Optional[OperationalData] = None
    tags: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    status: Optional[ListingStatus] = None

class ListingFilter(BaseModel):
    business_type: Optional[BusinessType] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_revenue: Optional[float] = None
    max_revenue: Optional[float] = None
    min_employees: Optional[int] = None
    max_employees: Optional[int] = None
    establishment_year_from: Optional[int] = None
    establishment_year_to: Optional[int] = None
    tags: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    status: Optional[ListingStatus] = None

# Helper functions
async def upload_to_s3(file: UploadFile, listing_id: int, file_type: str) -> str:
    """Upload file to S3 and return URL"""
    try:
        file_extension = file.filename.split('.')[-1]
        key = f"listings/{listing_id}/{file_type}/{uuid.uuid4()}.{file_extension}"
        
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

def format_listing(record: dict) -> dict:
    """Format database record to listing response"""
    return {
        "id": record["id"],
        "seller_id": record["seller_id"],
        "company_name": record["company_name"],
        "business_type": record["business_type"],
        "industry": record["industry"],
        "sub_industry": record["sub_industry"],
        "description": record["description"],
        "establishment_year": record["establishment_year"],
        "registration_number": record["registration_number"],
        "address": record["address"],
        "city": record["city"],
        "state": record["state"],
        "pincode": record["pincode"],
        "country": record["country"],
        "asking_price": float(record["asking_price"]) if record["asking_price"] else None,
        "negotiable": record["negotiable"],
        "price_justification": record["price_justification"],
        "primary_contact_name": record["primary_contact_name"],
        "primary_contact_phone": record["primary_contact_phone"],
        "primary_contact_email": record["primary_contact_email"],
        "financial_data": record["financial_data"],
        "assets": record["assets"],
        "marketing_info": record["marketing_info"],
        "operational_data": record["operational_data"],
        "tags": record["tags"],
        "keywords": record["keywords"],
        "featured_image_url": record["featured_image_url"],
        "gallery_images": record["gallery_images"],
        "documents": record["documents"],
        "status": record["status"],
        "view_count": record["view_count"],
        "interest_count": record["interest_count"],
        "created_at": record["created_at"],
        "updated_at": record["updated_at"],
        "approved_at": record["approved_at"],
        "approved_by": record["approved_by"]
    }

# API Endpoints

@app.post("/listings")
async def create_listing(
    listing: MSMEListing,
    current_user: dict = Depends(verify_token)
):
    """Create a new MSME listing"""
    if current_user["role"] not in ["seller", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sellers and admins can create listings"
        )
    
    conn = await get_db_connection()
    
    try:
        listing_id = await conn.fetchval(
            """
            INSERT INTO msme_listings (
                seller_id, company_name, business_type, industry, sub_industry,
                description, establishment_year, registration_number,
                address, city, state, pincode, country,
                asking_price, negotiable, price_justification,
                primary_contact_name, primary_contact_phone, primary_contact_email,
                financial_data, assets, marketing_info, operational_data,
                tags, keywords, status, view_count, interest_count,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
                $25, $26, $27, $28, $29, $30
            ) RETURNING id
            """,
            current_user["user_id"], listing.company_name, listing.business_type.value,
            listing.industry, listing.sub_industry, listing.description,
            listing.establishment_year, listing.registration_number,
            listing.address, listing.city, listing.state, listing.pincode,
            listing.country, listing.asking_price, listing.negotiable,
            listing.price_justification, listing.primary_contact_name,
            listing.primary_contact_phone, listing.primary_contact_email,
            json.dumps(listing.financial_data.dict()), json.dumps([asset.dict() for asset in listing.assets]),
            json.dumps(listing.marketing_info.dict()), json.dumps(listing.operational_data.dict()),
            listing.tags, listing.keywords, listing.status.value,
            0, 0, datetime.utcnow(), datetime.utcnow()
        )
        
        return {
            "message": "Listing created successfully",
            "listing_id": listing_id,
            "status": listing.status.value
        }
        
    finally:
        await conn.close()

@app.get("/listings/{listing_id}")
async def get_listing(listing_id: int):
    """Get a specific listing by ID"""
    conn = await get_db_connection()
    
    try:
        listing = await conn.fetchrow(
            "SELECT * FROM msme_listings WHERE id = $1",
            listing_id
        )
        
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        # Increment view count
        await conn.execute(
            "UPDATE msme_listings SET view_count = view_count + 1 WHERE id = $1",
            listing_id
        )
        
        return format_listing(listing)
        
    finally:
        await conn.close()

@app.get("/listings")
async def get_listings(
    limit: int = 20,
    offset: int = 0,
    status: Optional[ListingStatus] = None,
    business_type: Optional[BusinessType] = None,
    industry: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None
):
    """Get listings with filters"""
    conn = await get_db_connection()
    
    try:
        # Build query dynamically
        conditions = []
        params = []
        param_count = 1
        
        if status:
            conditions.append(f"status = ${param_count}")
            params.append(status.value)
            param_count += 1
        
        if business_type:
            conditions.append(f"business_type = ${param_count}")
            params.append(business_type.value)
            param_count += 1
        
        if industry:
            conditions.append(f"industry ILIKE ${param_count}")
            params.append(f"%{industry}%")
            param_count += 1
        
        if city:
            conditions.append(f"city ILIKE ${param_count}")
            params.append(f"%{city}%")
            param_count += 1
        
        if state:
            conditions.append(f"state ILIKE ${param_count}")
            params.append(f"%{state}%")
            param_count += 1
        
        if min_price:
            conditions.append(f"asking_price >= ${param_count}")
            params.append(min_price)
            param_count += 1
        
        if max_price:
            conditions.append(f"asking_price <= ${param_count}")
            params.append(max_price)
            param_count += 1
        
        if search:
            conditions.append(f"(company_name ILIKE ${param_count} OR description ILIKE ${param_count} OR ${param_count} = ANY(tags) OR ${param_count} = ANY(keywords))")
            params.extend([f"%{search}%", f"%{search}%", search, search])
            param_count += 4
        
        where_clause = " AND ".join(conditions) if conditions else "TRUE"
        
        query = f"""
            SELECT * FROM msme_listings 
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_count} OFFSET ${param_count + 1}
        """
        
        params.extend([limit, offset])
        
        listings = await conn.fetch(query, *params)
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM msme_listings WHERE {where_clause}"
        total_count = await conn.fetchval(count_query, *params[:-2])
        
        return {
            "listings": [format_listing(listing) for listing in listings],
            "total_count": total_count,
            "limit": limit,
            "offset": offset
        }
        
    finally:
        await conn.close()

@app.put("/listings/{listing_id}")
async def update_listing(
    listing_id: int,
    listing_update: ListingUpdate,
    current_user: dict = Depends(verify_token)
):
    """Update a listing"""
    conn = await get_db_connection()
    
    try:
        # Check if user owns the listing or is admin
        listing = await conn.fetchrow(
            "SELECT seller_id FROM msme_listings WHERE id = $1",
            listing_id
        )
        
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        if listing["seller_id"] != current_user["user_id"] and current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update other user's listing"
            )
        
        # Build update query dynamically
        update_fields = []
        values = []
        param_count = 1
        
        update_data = listing_update.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field in ["financial_data", "assets", "marketing_info", "operational_data"] and value is not None:
                if field == "assets":
                    value = json.dumps([asset.dict() for asset in value])
                elif field == "financial_data":
                    value = json.dumps(value.dict())
                elif field == "marketing_info":
                    value = json.dumps(value.dict())
                elif field == "operational_data":
                    value = json.dumps(value.dict())
                
            if field == "business_type" and value is not None:
                value = value.value
            elif field == "status" and value is not None:
                value = value.value
                
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
        
        values.append(listing_id)
        
        query = f"""
            UPDATE msme_listings 
            SET {', '.join(update_fields)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        updated_listing = await conn.fetchrow(query, *values)
        
        return {
            "message": "Listing updated successfully",
            "listing": format_listing(updated_listing)
        }
        
    finally:
        await conn.close()

@app.delete("/listings/{listing_id}")
async def delete_listing(
    listing_id: int,
    current_user: dict = Depends(verify_token)
):
    """Delete a listing"""
    conn = await get_db_connection()
    
    try:
        # Check if user owns the listing or is admin
        listing = await conn.fetchrow(
            "SELECT seller_id FROM msme_listings WHERE id = $1",
            listing_id
        )
        
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        if listing["seller_id"] != current_user["user_id"] and current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete other user's listing"
            )
        
        await conn.execute(
            "DELETE FROM msme_listings WHERE id = $1",
            listing_id
        )
        
        return {"message": "Listing deleted successfully"}
        
    finally:
        await conn.close()

@app.post("/listings/{listing_id}/upload-image")
async def upload_listing_image(
    listing_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(verify_token)
):
    """Upload image for listing"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP allowed"
        )
    
    conn = await get_db_connection()
    
    try:
        # Check if user owns the listing or is admin
        listing = await conn.fetchrow(
            "SELECT seller_id, gallery_images FROM msme_listings WHERE id = $1",
            listing_id
        )
        
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        if listing["seller_id"] != current_user["user_id"] and current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot upload images for other user's listing"
            )
        
        # Upload to S3
        image_url = await upload_to_s3(file, listing_id, "images")
        
        # Update listing with new image
        gallery_images = listing["gallery_images"] or []
        gallery_images.append(image_url)
        
        await conn.execute(
            "UPDATE msme_listings SET gallery_images = $1, updated_at = $2 WHERE id = $3",
            gallery_images, datetime.utcnow(), listing_id
        )
        
        return {
            "message": "Image uploaded successfully",
            "image_url": image_url
        }
        
    finally:
        await conn.close()

@app.post("/listings/{listing_id}/upload-document")
async def upload_listing_document(
    listing_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(verify_token)
):
    """Upload document for listing"""
    # Validate file type
    allowed_types = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF and DOC/DOCX allowed"
        )
    
    conn = await get_db_connection()
    
    try:
        # Check if user owns the listing or is admin
        listing = await conn.fetchrow(
            "SELECT seller_id, documents FROM msme_listings WHERE id = $1",
            listing_id
        )
        
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        if listing["seller_id"] != current_user["user_id"] and current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot upload documents for other user's listing"
            )
        
        # Upload to S3
        document_url = await upload_to_s3(file, listing_id, "documents")
        
        # Update listing with new document
        documents = listing["documents"] or []
        documents.append(document_url)
        
        await conn.execute(
            "UPDATE msme_listings SET documents = $1, updated_at = $2 WHERE id = $3",
            documents, datetime.utcnow(), listing_id
        )
        
        return {
            "message": "Document uploaded successfully",
            "document_url": document_url
        }
        
    finally:
        await conn.close()

@app.post("/listings/{listing_id}/approve")
async def approve_listing(
    listing_id: int,
    current_user: dict = Depends(verify_token)
):
    """Approve a listing (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can approve listings"
        )
    
    conn = await get_db_connection()
    
    try:
        updated_listing = await conn.fetchrow(
            """
            UPDATE msme_listings 
            SET status = 'active', approved_by = $1, approved_at = $2, updated_at = $2
            WHERE id = $3
            RETURNING *
            """,
            current_user["user_id"], datetime.utcnow(), listing_id
        )
        
        if not updated_listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        return {
            "message": "Listing approved successfully",
            "listing": format_listing(updated_listing)
        }
        
    finally:
        await conn.close()

@app.post("/listings/{listing_id}/reject")
async def reject_listing(
    listing_id: int,
    reason: str,
    current_user: dict = Depends(verify_token)
):
    """Reject a listing (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can reject listings"
        )
    
    conn = await get_db_connection()
    
    try:
        updated_listing = await conn.fetchrow(
            """
            UPDATE msme_listings 
            SET status = 'rejected', rejection_reason = $1, rejected_by = $2, rejected_at = $3, updated_at = $3
            WHERE id = $4
            RETURNING *
            """,
            reason, current_user["user_id"], datetime.utcnow(), listing_id
        )
        
        if not updated_listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        return {
            "message": "Listing rejected successfully",
            "listing": format_listing(updated_listing)
        }
        
    finally:
        await conn.close()

@app.get("/listings/my-listings")
async def get_my_listings(
    current_user: dict = Depends(verify_token),
    limit: int = 20,
    offset: int = 0
):
    """Get current user's listings"""
    conn = await get_db_connection()
    
    try:
        listings = await conn.fetch(
            """
            SELECT * FROM msme_listings 
            WHERE seller_id = $1 
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            """,
            current_user["user_id"], limit, offset
        )
        
        total_count = await conn.fetchval(
            "SELECT COUNT(*) FROM msme_listings WHERE seller_id = $1",
            current_user["user_id"]
        )
        
        return {
            "listings": [format_listing(listing) for listing in listings],
            "total_count": total_count,
            "limit": limit,
            "offset": offset
        }
        
    finally:
        await conn.close()

@app.get("/listings/stats")
async def get_listing_stats():
    """Get listing statistics"""
    conn = await get_db_connection()
    
    try:
        stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) as total_listings,
                COUNT(*) FILTER (WHERE status = 'active') as active_listings,
                COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_listings,
                COUNT(*) FILTER (WHERE status = 'sold') as sold_listings,
                AVG(asking_price) as avg_asking_price,
                AVG(view_count) as avg_views,
                AVG(interest_count) as avg_interests
            FROM msme_listings
            """
        )
        
        return dict(stats)
        
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
            "service": "msme-listing-service",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)