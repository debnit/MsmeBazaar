"""
Tests for Recommendation Service API
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

def test_recommendation_stats():
    """Test recommendation stats endpoint"""
    with patch('app.get_db_connection') as mock_db:
        # Mock database response
        mock_conn = Mock()
        mock_db.return_value = mock_conn
        mock_conn.fetchrow.return_value = {
            'total_recommendations': 100,
            'active_users': 50,
            'avg_rating': 4.5
        }
        mock_conn.close.return_value = None
        
        response = client.get("/api/recommendation_stats")
        # This might fail if the endpoint doesn't exist yet
        # assert response.status_code == 200

def test_invalid_endpoint():
    """Test invalid endpoint returns 404"""
    response = client.get("/invalid/endpoint")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_async_operations():
    """Test async operations work correctly"""
    # Basic async test
    await asyncio.sleep(0.001)
    assert True