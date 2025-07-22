"""
Shared configuration module for MSMEBazaar V2.0
Provides centralized configuration management with validation and type safety.
"""

import os
from typing import List, Optional, Union
from pydantic import BaseSettings, Field, validator
from enum import Enum


class Environment(str, Enum):
    """Application environment types"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class LogLevel(str, Enum):
    """Logging level options"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class DatabaseConfig(BaseSettings):
    """Database configuration with connection pooling"""
    
    url: str = Field(..., env="DATABASE_URL")
    pool_min_size: int = Field(10, env="DB_POOL_MIN_SIZE")
    pool_max_size: int = Field(20, env="DB_POOL_MAX_SIZE")
    pool_timeout: int = Field(30, env="DB_POOL_TIMEOUT")
    
    @validator('url')
    def validate_database_url(cls, v):
        """Validate database URL format"""
        if not v.startswith(('postgresql://', 'postgres://')):
            raise ValueError('Database URL must be a PostgreSQL connection string')
        return v
    
    class Config:
        env_prefix = "DB_"


class RedisConfig(BaseSettings):
    """Redis configuration for caching and sessions"""
    
    url: str = Field(..., env="REDIS_URL")
    host: str = Field("localhost", env="REDIS_HOST")
    port: int = Field(6379, env="REDIS_PORT")
    db: int = Field(0, env="REDIS_DB")
    password: Optional[str] = Field(None, env="REDIS_PASSWORD")
    
    # TTL settings in seconds
    session_ttl: int = Field(86400, env="SESSION_TTL")  # 24 hours
    cache_ttl: int = Field(3600, env="CACHE_TTL")       # 1 hour
    otp_ttl: int = Field(300, env="OTP_TTL")            # 5 minutes
    
    class Config:
        env_prefix = "REDIS_"


class SecurityConfig(BaseSettings):
    """Security and authentication configuration"""
    
    jwt_secret: str = Field(..., env="JWT_SECRET")
    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")
    jwt_access_token_expire_minutes: int = Field(30, env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")
    jwt_refresh_token_expire_days: int = Field(7, env="JWT_REFRESH_TOKEN_EXPIRE_DAYS")
    
    bcrypt_rounds: int = Field(12, env="BCRYPT_ROUNDS")
    
    # Rate limiting
    rate_limit_requests: int = Field(100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(60, env="RATE_LIMIT_WINDOW")
    
    @validator('jwt_secret')
    def validate_jwt_secret(cls, v):
        """Validate JWT secret strength"""
        if len(v) < 32:
            raise ValueError('JWT secret must be at least 32 characters long')
        return v
    
    class Config:
        env_prefix = "JWT_"


class TwilioConfig(BaseSettings):
    """Twilio configuration for SMS and WhatsApp"""
    
    account_sid: str = Field(..., env="TWILIO_ACCOUNT_SID")
    auth_token: str = Field(..., env="TWILIO_AUTH_TOKEN")
    phone_number: str = Field(..., env="TWILIO_PHONE_NUMBER")
    whatsapp_number: str = Field(..., env="TWILIO_WHATSAPP_NUMBER")
    
    class Config:
        env_prefix = "TWILIO_"


class OpenAIConfig(BaseSettings):
    """OpenAI configuration for embeddings and chat"""
    
    api_key: str = Field(..., env="OPENAI_API_KEY")
    model: str = Field("gpt-4", env="OPENAI_MODEL")
    embedding_model: str = Field("text-embedding-ada-002", env="OPENAI_EMBEDDING_MODEL")
    
    class Config:
        env_prefix = "OPENAI_"


class RazorpayConfig(BaseSettings):
    """Razorpay configuration for payments"""
    
    key_id: str = Field(..., env="RAZORPAY_KEY_ID")
    key_secret: str = Field(..., env="RAZORPAY_KEY_SECRET")
    
    class Config:
        env_prefix = "RAZORPAY_"


class StorageConfig(BaseSettings):
    """File storage configuration (S3/MinIO)"""
    
    # AWS S3 Configuration
    aws_access_key_id: Optional[str] = Field(None, env="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = Field(None, env="AWS_SECRET_ACCESS_KEY")
    aws_region: str = Field("ap-south-1", env="AWS_REGION")
    s3_bucket_name: Optional[str] = Field(None, env="S3_BUCKET_NAME")
    
    # MinIO Configuration (Alternative)
    minio_endpoint: Optional[str] = Field(None, env="MINIO_ENDPOINT")
    minio_access_key: Optional[str] = Field(None, env="MINIO_ACCESS_KEY")
    minio_secret_key: Optional[str] = Field(None, env="MINIO_SECRET_KEY")
    minio_bucket_name: Optional[str] = Field(None, env="MINIO_BUCKET_NAME")
    
    # File Upload Settings
    max_file_size: int = Field(10485760, env="MAX_FILE_SIZE")  # 10MB
    allowed_file_types: List[str] = Field(
        ["pdf", "doc", "docx", "jpg", "jpeg", "png"], 
        env="ALLOWED_FILE_TYPES"
    )
    
    @validator('allowed_file_types', pre=True)
    def parse_file_types(cls, v):
        """Parse comma-separated file types"""
        if isinstance(v, str):
            return [ext.strip() for ext in v.split(',')]
        return v
    
    class Config:
        env_prefix = "STORAGE_"


class VectorDBConfig(BaseSettings):
    """Vector database configuration (Weaviate/FAISS)"""
    
    # Weaviate Configuration
    weaviate_url: Optional[str] = Field(None, env="WEAVIATE_URL")
    weaviate_api_key: Optional[str] = Field(None, env="WEAVIATE_API_KEY")
    
    # FAISS Configuration (Alternative)
    faiss_index_path: str = Field("./data/faiss_index", env="FAISS_INDEX_PATH")
    faiss_dimension: int = Field(1536, env="FAISS_DIMENSION")
    
    class Config:
        env_prefix = "VECTOR_"


class ServiceConfig(BaseSettings):
    """Microservices URLs and ports configuration"""
    
    # Service URLs
    auth_api_url: str = Field("http://localhost:8001", env="AUTH_API_URL")
    msme_api_url: str = Field("http://localhost:8002", env="MSME_API_URL")
    valuation_api_url: str = Field("http://localhost:8003", env="VALUATION_API_URL")
    match_api_url: str = Field("http://localhost:8004", env="MATCH_API_URL")
    admin_api_url: str = Field("http://localhost:8005", env="ADMIN_API_URL")
    whatsapp_bot_url: str = Field("http://localhost:5000", env="WHATSAPP_BOT_URL")
    web_app_url: str = Field("http://localhost:3000", env="WEB_APP_URL")
    
    # Service Ports
    auth_api_port: int = Field(8001, env="AUTH_API_PORT")
    msme_api_port: int = Field(8002, env="MSME_API_PORT")
    valuation_api_port: int = Field(8003, env="VALUATION_API_PORT")
    match_api_port: int = Field(8004, env="MATCH_API_PORT")
    admin_api_port: int = Field(8005, env="ADMIN_API_PORT")
    whatsapp_bot_port: int = Field(5000, env="WHATSAPP_BOT_PORT")
    web_app_port: int = Field(3000, env="WEB_APP_PORT")
    
    class Config:
        env_prefix = "SERVICE_"


class MonitoringConfig(BaseSettings):
    """Monitoring and logging configuration"""
    
    # Sentry Configuration
    sentry_dsn: Optional[str] = Field(None, env="SENTRY_DSN")
    sentry_environment: str = Field("development", env="SENTRY_ENVIRONMENT")
    
    # Prometheus Configuration
    prometheus_port: int = Field(9090, env="PROMETHEUS_PORT")
    grafana_port: int = Field(3001, env="GRAFANA_PORT")
    
    # Logging Configuration
    log_level: LogLevel = Field(LogLevel.INFO, env="LOG_LEVEL")
    log_format: str = Field("json", env="LOG_FORMAT")
    log_file_path: str = Field("./logs/msmebazaar.log", env="LOG_FILE_PATH")
    
    class Config:
        env_prefix = "MONITORING_"


class EmailConfig(BaseSettings):
    """Email configuration for notifications"""
    
    smtp_host: str = Field("smtp.gmail.com", env="SMTP_HOST")
    smtp_port: int = Field(587, env="SMTP_PORT")
    smtp_user: str = Field(..., env="SMTP_USER")
    smtp_password: str = Field(..., env="SMTP_PASSWORD")
    smtp_from_name: str = Field("MSMEBazaar", env="SMTP_FROM_NAME")
    smtp_from_email: str = Field(..., env="SMTP_FROM_EMAIL")
    
    class Config:
        env_prefix = "SMTP_"


class ApplicationConfig(BaseSettings):
    """Main application configuration"""
    
    # Environment
    environment: Environment = Field(Environment.DEVELOPMENT, env="ENVIRONMENT")
    debug: bool = Field(True, env="DEBUG")
    
    # CORS Configuration
    cors_origins: List[str] = Field(
        ["http://localhost:3000", "http://localhost:3001"], 
        env="CORS_ORIGINS"
    )
    cors_methods: List[str] = Field(
        ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
        env="CORS_METHODS"
    )
    cors_headers: List[str] = Field(
        ["Content-Type", "Authorization"], 
        env="CORS_HEADERS"
    )
    
    # API Configuration
    api_version: str = Field("v1", env="API_VERSION")
    api_prefix: str = Field("/api", env="API_PREFIX")
    api_docs_url: str = Field("/docs", env="API_DOCS_URL")
    api_redoc_url: str = Field("/redoc", env="API_REDOC_URL")
    
    # Pagination
    default_page_size: int = Field(20, env="DEFAULT_PAGE_SIZE")
    max_page_size: int = Field(100, env="MAX_PAGE_SIZE")
    
    # Development Tools
    enable_swagger: bool = Field(True, env="ENABLE_SWAGGER")
    enable_redoc: bool = Field(True, env="ENABLE_REDOC")
    enable_debug_toolbar: bool = Field(True, env="ENABLE_DEBUG_TOOLBAR")
    enable_reload: bool = Field(True, env="ENABLE_RELOAD")
    
    @validator('cors_origins', 'cors_methods', 'cors_headers', pre=True)
    def parse_cors_lists(cls, v):
        """Parse comma-separated CORS configuration"""
        if isinstance(v, str):
            return [item.strip() for item in v.split(',')]
        return v
    
    class Config:
        env_prefix = "APP_"


class BusinessConfig(BaseSettings):
    """Business logic configuration"""
    
    # Valuation Settings
    valuation_basic_price: int = Field(199, env="VALUATION_BASIC_PRICE")
    valuation_premium_price: int = Field(499, env="VALUATION_PREMIUM_PRICE")
    valuation_enterprise_price: int = Field(999, env="VALUATION_ENTERPRISE_PRICE")
    
    # Matching Settings
    match_similarity_threshold: float = Field(0.7, env="MATCH_SIMILARITY_THRESHOLD")
    max_match_results: int = Field(10, env="MAX_MATCH_RESULTS")
    
    # KYC Settings
    kyc_required_documents: List[str] = Field(
        ["pan", "gst", "bank_statement"], 
        env="KYC_REQUIRED_DOCUMENTS"
    )
    kyc_verification_timeout: int = Field(72, env="KYC_VERIFICATION_TIMEOUT")  # hours
    
    @validator('kyc_required_documents', pre=True)
    def parse_kyc_documents(cls, v):
        """Parse comma-separated KYC documents"""
        if isinstance(v, str):
            return [doc.strip() for doc in v.split(',')]
        return v
    
    @validator('match_similarity_threshold')
    def validate_similarity_threshold(cls, v):
        """Validate similarity threshold is between 0 and 1"""
        if not 0 <= v <= 1:
            raise ValueError('Similarity threshold must be between 0 and 1')
        return v
    
    class Config:
        env_prefix = "BUSINESS_"


class Settings(BaseSettings):
    """Main settings class that combines all configuration sections"""
    
    # Core configurations
    database: DatabaseConfig = DatabaseConfig()
    redis: RedisConfig = RedisConfig()
    security: SecurityConfig = SecurityConfig()
    application: ApplicationConfig = ApplicationConfig()
    business: BusinessConfig = BusinessConfig()
    
    # External service configurations
    twilio: TwilioConfig = TwilioConfig()
    openai: OpenAIConfig = OpenAIConfig()
    razorpay: RazorpayConfig = RazorpayConfig()
    
    # Infrastructure configurations
    storage: StorageConfig = StorageConfig()
    vector_db: VectorDBConfig = VectorDBConfig()
    services: ServiceConfig = ServiceConfig()
    monitoring: MonitoringConfig = MonitoringConfig()
    email: EmailConfig = EmailConfig()
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.application.environment == Environment.DEVELOPMENT
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.application.environment == Environment.PRODUCTION
    
    def is_testing(self) -> bool:
        """Check if running in testing environment"""
        return self.application.environment == Environment.TESTING
    
    def get_database_url(self) -> str:
        """Get the appropriate database URL for current environment"""
        if self.is_testing():
            return os.getenv("TEST_DATABASE_URL", self.database.url)
        return self.database.url
    
    def get_redis_url(self) -> str:
        """Get the appropriate Redis URL for current environment"""
        if self.is_testing():
            return os.getenv("TEST_REDIS_URL", self.redis.url)
        return self.redis.url
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get the global settings instance"""
    return settings