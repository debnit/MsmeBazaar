# libs/db/models/model_metadata.py
import uuid
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class ModelMetadata(Base):
    __tablename__ = "model_metadata"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    training_data_info = Column(JSON)
    metrics = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
