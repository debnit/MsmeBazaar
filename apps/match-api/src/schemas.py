from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum

class MatchType(str, Enum):
    BUYER_MSME = "BUYER_MSME"
    MSME_BUYER = "MSME_BUYER"
    INVESTOR_MSME = "INVESTOR_MSME"
    ACQUISITION_MSME = "ACQUISITION_MSME"

class MatchStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class MatchScore(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class MatchRequestCreate(BaseModel):
    profile_id: str = Field(..., description="Profile ID to match")
    match_type: MatchType = Field(..., description="Type of matching to perform")
    search_criteria: Optional[Dict[str, Any]] = Field(default={}, description="Search criteria filters")
    
    # Optional filters
    industry_filter: Optional[List[str]] = Field(None, description="Filter by industries")
    location_filter: Optional[List[str]] = Field(None, description="Filter by locations")
    size_filter: Optional[List[str]] = Field(None, description="Filter by company sizes")
    min_score: Optional[float] = Field(0.7, ge=0, le=1, description="Minimum match score threshold")
    max_results: Optional[int] = Field(20, ge=1, le=100, description="Maximum number of results")

class MatchRequestResponse(BaseModel):
    id: str
    user_id: str
    profile_id: str
    match_type: MatchType
    status: MatchStatus
    search_criteria: Optional[Dict[str, Any]]
    processing_started_at: Optional[datetime]
    processing_completed_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class MatchResultResponse(BaseModel):
    id: str
    request_id: str
    matched_profile_id: str
    match_score: float = Field(..., description="Overall match score (0-1)")
    match_grade: MatchScore
    match_factors: Optional[Dict[str, Any]] = Field(None, description="Detailed match factors")
    similarity_score: Optional[float] = Field(None, description="Vector similarity score")
    profile_data: Optional[Dict[str, Any]] = Field(None, description="Matched profile data")
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProfileEmbeddingResponse(BaseModel):
    id: str
    profile_id: str
    profile_type: str
    text_content: str
    industry: Optional[str]
    location: Optional[str]
    size_category: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Search query text")
    profile_type: str = Field(..., description="Type of profiles to search (MSME/BUYER)")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of results")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")
    
    @validator('profile_type')
    def validate_profile_type(cls, v):
        if v not in ['MSME', 'BUYER', 'INVESTOR']:
            raise ValueError('profile_type must be MSME, BUYER, or INVESTOR')
        return v

class SemanticSearchResponse(BaseModel):
    query: str
    matches: List[Dict[str, Any]]
    total: int
    processing_time_ms: Optional[float] = None

class MatchStatsResponse(BaseModel):
    total_requests: int
    completed_requests: int
    completion_rate: float
    total_matches: int
    high_grade_matches: int
    high_grade_rate: float
    average_match_score: float

class EmbeddingCreateRequest(BaseModel):
    profile_id: str = Field(..., description="Profile ID to create embedding for")
    profile_type: str = Field(..., description="Type of profile (MSME/BUYER/INVESTOR)")
    force_refresh: bool = Field(False, description="Force refresh existing embedding")
    
    @validator('profile_type')
    def validate_profile_type(cls, v):
        if v not in ['MSME', 'BUYER', 'INVESTOR']:
            raise ValueError('profile_type must be MSME, BUYER, or INVESTOR')
        return v

class EmbeddingCreateResponse(BaseModel):
    embedding_id: str
    profile_id: str
    message: str
    created_at: datetime

class HealthCheckResponse(BaseModel):
    status: str
    timestamp: datetime
    services: Dict[str, str]
    version: str

class ErrorResponse(BaseModel):
    error: str
    message: str
    timestamp: datetime
    request_id: Optional[str] = None