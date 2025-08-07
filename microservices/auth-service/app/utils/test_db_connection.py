import pytest
from sqlalchemy import text
from libs.db.session import async_session


@pytest.mark.asyncio
async def test_connection():
    try:
        async with async_session() as session:
            result = await session.execute(text("SELECT 1"))
            assert result.scalar() == 1
    except Exception as e:
        pytest.fail(f"DB connection failed: {e}")
