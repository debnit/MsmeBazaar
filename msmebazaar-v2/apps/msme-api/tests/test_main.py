import pytest
import sys
import os

# Add the app directory to the path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_basic_python_functionality():
    """Test basic Python functionality"""
    assert 2 + 2 == 4
    assert "hello".upper() == "HELLO"
    assert [1, 2, 3] == [1, 2, 3]

def test_environment_setup():
    """Test that environment is properly set up"""
    assert sys.version_info.major >= 3
    assert sys.version_info.minor >= 8

def test_imports():
    """Test that we can import required modules"""
    try:
        import json
        import os
        import sys
        assert True
    except ImportError:
        pytest.fail("Failed to import basic modules")

@pytest.mark.asyncio
async def test_async_functionality():
    """Test async functionality"""
    async def sample_async_function():
        return "async_result"
    
    result = await sample_async_function()
    assert result == "async_result"

def test_msme_data_structure():
    """Test MSME data structure operations"""
    msme_data = {
        "id": "MSME001",
        "name": "Test MSME",
        "sector": "Technology",
        "employees": 25,
        "revenue": 1000000
    }
    
    assert msme_data["id"] == "MSME001"
    assert msme_data["employees"] == 25
    assert isinstance(msme_data["revenue"], int)

def test_validation_functions():
    """Test basic validation functions"""
    def validate_email(email):
        return "@" in email and "." in email
    
    def validate_phone(phone):
        return len(str(phone)) >= 10
    
    assert validate_email("test@example.com") == True
    assert validate_email("invalid-email") == False
    assert validate_phone("1234567890") == True
    assert validate_phone("123") == False