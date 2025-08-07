from sqlalchemy.ext.asyncio import AsyncSession
from app.models.msme import MSMEModel
from libs.db.session import get_db

async def get_msme_data(db: AsyncSession = Depends(get_db)):
    return {"message": "Hello from MSME service"}
