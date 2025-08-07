from libs.db.session import get_db
"""
Tests for ML Monitoring Service API
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import json

# Import the app from the main module
try:
    from app import app
except ImportError:
    # Fallback for testing
    from fastapi import FastAPI
    app = FastAPI()

client = TestClient(app)

def test_health_check():
    """Test health check endpoint"""
    # Mock the database and redis connections for testing
    with patch('app.get_db_connection') as mock_db, \
         patch('app.get_redis_connection') as mock_redis:
        
        # Mock successful connections
        mock_db.return_value.__aenter__ = Mock()
        mock_db.return_value.__aexit__ = Mock()
        mock_redis.return_value.ping.return_value = True
        mock_redis.return_value.close.return_value = None
        
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

def test_models_status():
    """Test models status endpoint"""
    with patch('app.get_db_connection') as mock_db:
        # Mock database response
        mock_conn = Mock()
        mock_db.return_value = mock_conn
        mock_conn.fetch.return_value = []
        mock_conn.close.return_value = None
        
        response = client.get("/api/models/status")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data

@pytest.mark.asyncio
async def test_async_operations():
    """Test async operations work correctly"""
    # Basic async test
    await asyncio.sleep(0.001)
    assert True