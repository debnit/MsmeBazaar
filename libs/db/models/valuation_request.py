from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from libs.db.base import Base
from libs.shared.enums import ValuationStatusEnum


class ValuationRequest(Base):
    __tablename__ = valuation_request

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    business_id = Column(UUID(as_uuid=True), ForeignKey(business.id), nullable=False)

    status = Column(Enum(ValuationStatusEnum), default=ValuationStatusEnum.PENDING)
    report_url = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship(Business, back_populates=valuation_requests)

