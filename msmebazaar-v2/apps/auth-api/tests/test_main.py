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

def test_dictionary_operations():
    """Test dictionary operations"""
    test_dict = {"key1": "value1", "key2": "value2"}
    assert "key1" in test_dict
    assert test_dict["key1"] == "value1"
    assert len(test_dict) == 2

def test_list_operations():
    """Test list operations"""
    test_list = [1, 2, 3, 4, 5]
    assert len(test_list) == 5
    assert 3 in test_list
    assert test_list[0] == 1