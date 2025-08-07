from sqlalchemy import Column, String, DateTime, JSON
from uuid import uuid4
from datetime import datetime
from libs.db.base import Base


class AuditLog(Base):
    __tablename__ = audit_logs

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    action = Column(String, nullable=False)
    performed_by = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(JSON, nullable=True)

