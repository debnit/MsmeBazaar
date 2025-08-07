# libs/db/models/monitoring_alert.py
import uuid
from sqlalchemy import Column, String, DateTime, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base

from enum import Enum as PyEnum

Base = declarative_base()

class AlertType(PyEnum):
    DRIFT = "drift"
    DATA_QUALITY = "data_quality"
    FAILURE = "failure"

class MonitoringAlert(Base):
    __tablename__ = "monitoring_alert"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id = Column(UUID(as_uuid=True), nullable=False)
    alert_type = Column(Enum(AlertType), nullable=False)
    message = Column(String)
    metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
