# libs/db/models/device.py
import uuid
from sqlalchemy import Column, String, DateTime, UUID as SQLUUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Device(Base):
    __tablename__ = "device"

    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(SQLUUID(as_uuid=True), nullable=False)
    device_type = Column(String)
    device_id = Column(String, unique=True)
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
