# libs/db/models/user_points.py
import uuid
from sqlalchemy import Column, Integer, UUID as SQLUUID, DateTime
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class UserPoints(Base):
    __tablename__ = "user_points"

    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(SQLUUID(as_uuid=True), nullable=False)
    points = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
