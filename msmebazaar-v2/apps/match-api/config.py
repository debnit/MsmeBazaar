from pydantic_settings import BaseSettings
from typing import Optional, List
import os

class Settings(BaseSettings):
    # Application
    app_name: str = "MSMEBazaar Match API"
    app_version: str = "2.0.0"
    debug: bool = False
    
    # Database
    database_url: str
    
    # Redis
    redis_url: str
    
    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4-turbo-preview"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_max_tokens: int = 4000
    
    # Weaviate
    weaviate_url: str = "http://localhost:8080"
    weaviate_api_key: Optional[str] = None
    weaviate_class_name: str = "MSMEProfile"
    
    # Matching Configuration
    max_matches: int = 50
    default_match_limit: int = 5
    similarity_threshold: float = 0.7
    
    # Caching
    cache_ttl_seconds: int = 3600  # 1 hour
    embedding_cache_ttl: int = 86400  # 24 hours
    
    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60
    
    # Monitoring
    sentry_dsn: Optional[str] = None
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]
    cors_credentials: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()