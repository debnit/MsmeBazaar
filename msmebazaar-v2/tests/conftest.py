import pytest
import asyncio
import asyncpg
import redis.asyncio as redis
from httpx import AsyncClient
from fastapi.testclient import TestClient
import os
from typing import AsyncGenerator, Generator
import uuid
from datetime import datetime, timedelta
import jwt
from unittest.mock import AsyncMock, MagicMock

# Test database configuration
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql://test:test@localhost:5433/test_msmebazaar")
TEST_REDIS_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6380")

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_db_pool():
    """Create a test database connection pool."""
    pool = await asyncpg.create_pool(TEST_DATABASE_URL)
    
    # Create tables
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                phone VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(255),
                email VARCHAR(255),
                role VARCHAR(50) DEFAULT 'MSME',
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS msme_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                business_name VARCHAR(255),
                sector VARCHAR(100),
                pincode VARCHAR(10),
                description TEXT,
                annual_revenue DECIMAL(15,2),
                employee_count INTEGER,
                established_year INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS otp_codes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                phone VARCHAR(20) NOT NULL,
                otp_code VARCHAR(10) NOT NULL,
                purpose VARCHAR(50) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
    
    yield pool
    await pool.close()

@pytest.fixture(scope="session")
async def test_redis():
    """Create a test Redis client."""
    redis_client = redis.from_url(TEST_REDIS_URL)
    await redis_client.flushdb()
    yield redis_client
    await redis_client.close()

@pytest.fixture
async def clean_db(test_db_pool):
    """Clean database before each test."""
    async with test_db_pool.acquire() as conn:
        await conn.execute("DELETE FROM otp_codes")
        await conn.execute("DELETE FROM msme_profiles")
        await conn.execute("DELETE FROM users")
    yield
    async with test_db_pool.acquire() as conn:
        await conn.execute("DELETE FROM otp_codes")
        await conn.execute("DELETE FROM msme_profiles")
        await conn.execute("DELETE FROM users")

@pytest.fixture
async def clean_redis(test_redis):
    """Clean Redis before each test."""
    await test_redis.flushdb()
    yield
    await test_redis.flushdb()

@pytest.fixture
async def test_user(test_db_pool):
    """Create a test user."""
    user_id = str(uuid.uuid4())
    phone = "+919876543210"
    
    async with test_db_pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO users (id, phone, name, email, role, is_verified)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, user_id, phone, "Test User", "test@example.com", "MSME", True)
    
    return {
        "id": user_id,
        "phone": phone,
        "name": "Test User",
        "email": "test@example.com",
        "role": "MSME",
        "is_verified": True
    }

@pytest.fixture
async def test_msme_profile(test_db_pool, test_user):
    """Create a test MSME profile."""
    profile_id = str(uuid.uuid4())
    
    async with test_db_pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO msme_profiles (id, user_id, business_name, sector, pincode, description, annual_revenue, employee_count, established_year)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, profile_id, test_user["id"], "Test Business", "Technology", "400001", "A test business", 1000000, 10, 2020)
    
    return {
        "id": profile_id,
        "user_id": test_user["id"],
        "business_name": "Test Business",
        "sector": "Technology",
        "pincode": "400001",
        "description": "A test business",
        "annual_revenue": 1000000,
        "employee_count": 10,
        "established_year": 2020
    }

@pytest.fixture
def jwt_token(test_user):
    """Generate a JWT token for testing."""
    payload = {
        "user_id": test_user["id"],
        "phone": test_user["phone"],
        "role": test_user["role"],
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    
    secret = os.getenv("JWT_SECRET", "test-secret-key")
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token

@pytest.fixture
def auth_headers(jwt_token):
    """Generate authorization headers for testing."""
    return {"Authorization": f"Bearer {jwt_token}"}

@pytest.fixture
async def auth_client():
    """Create a test client for auth-api."""
    # Import here to avoid circular imports
    import sys
    sys.path.append("msmebazaar-v2/apps/auth-api")
    from main import app
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def msme_client():
    """Create a test client for msme-api."""
    import sys
    sys.path.append("msmebazaar-v2/apps/msme-api")
    from main import app
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def match_client():
    """Create a test client for match-api."""
    import sys
    sys.path.append("msmebazaar-v2/apps/match-api")
    from main import app
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def admin_client():
    """Create a test client for admin-api."""
    import sys
    sys.path.append("msmebazaar-v2/apps/admin-api")
    from main import app
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def valuation_client():
    """Create a test client for valuation-api."""
    import sys
    sys.path.append("msmebazaar-v2/apps/valuation-api")
    from main import app
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
def mock_twilio():
    """Mock Twilio client for testing."""
    mock = MagicMock()
    mock.messages.create.return_value = MagicMock(sid="test_sid")
    return mock

@pytest.fixture
def mock_openai():
    """Mock OpenAI client for testing."""
    mock = AsyncMock()
    mock.embeddings.create.return_value = MagicMock(
        data=[MagicMock(embedding=[0.1] * 1536)]
    )
    return mock

@pytest.fixture
def mock_s3():
    """Mock S3 client for testing."""
    mock = MagicMock()
    mock.upload_file.return_value = None
    mock.generate_presigned_url.return_value = "https://test-bucket.s3.amazonaws.com/test-file"
    return mock

@pytest.fixture
def mock_redis_client():
    """Mock Redis client for testing."""
    mock = AsyncMock()
    mock.get.return_value = None
    mock.set.return_value = True
    mock.delete.return_value = True
    mock.exists.return_value = False
    return mock

# Test data fixtures
@pytest.fixture
def sample_register_data():
    """Sample registration data for testing."""
    return {
        "phone": "+919876543210",
        "name": "Test User",
        "email": "test@example.com",
        "role": "MSME"
    }

@pytest.fixture
def sample_otp_data():
    """Sample OTP data for testing."""
    return {
        "phone": "+919876543210",
        "otp": "123456",
        "purpose": "REGISTRATION"
    }

@pytest.fixture
def sample_msme_data():
    """Sample MSME profile data for testing."""
    return {
        "business_name": "Test Business",
        "sector": "Technology",
        "pincode": "400001",
        "description": "A test business in technology sector",
        "annual_revenue": 1000000,
        "employee_count": 10,
        "established_year": 2020,
        "website": "https://testbusiness.com",
        "contact_email": "contact@testbusiness.com"
    }

@pytest.fixture
def sample_buyer_preferences():
    """Sample buyer preferences for matching."""
    return {
        "sectors": ["Technology", "Healthcare"],
        "location": "Mumbai",
        "revenue_range": {"min": 500000, "max": 2000000},
        "employee_range": {"min": 5, "max": 50},
        "requirements": "Looking for tech startups with good growth potential"
    }

# Environment setup
@pytest.fixture(autouse=True)
def setup_test_env():
    """Set up test environment variables."""
    os.environ.update({
        "DATABASE_URL": TEST_DATABASE_URL,
        "REDIS_URL": TEST_REDIS_URL,
        "JWT_SECRET": "test-secret-key",
        "TWILIO_ACCOUNT_SID": "test_sid",
        "TWILIO_AUTH_TOKEN": "test_token",
        "OPENAI_API_KEY": "test_openai_key",
        "AWS_ACCESS_KEY_ID": "test_access_key",
        "AWS_SECRET_ACCESS_KEY": "test_secret_key",
        "S3_BUCKET_NAME": "test-bucket",
        "ENVIRONMENT": "test"
    })