import jwt
from datetime import datetime, timedelta
from fastapi import status

JWT_SECRET = "your-secret-key"

def create_test_token():
    payload = {
        "user_id": "test-admin",
        "role": "admin",
        "exp": datetime.utcnow() + timedelta(minutes=10)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def test_health_check(async_client):
    response = await async_client.get("/admin/health")
    assert response.status_code == 200
    assert response.json()["status"] in ["healthy", "unhealthy"]

async def test_get_msmes_unauthorized(async_client):
    response = await async_client.get("/admin/msmes")
    assert response.status_code == status.HTTP_403_FORBIDDEN or status.HTTP_401_UNAUTHORIZED

async def test_get_msmes_success(async_client):
    token = create_test_token()
    response = await async_client.get(
        "/admin/msmes",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert isinstance(data["data"], list)
