from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from libs.db.base_class import Base
from datetime import datetime
from libs.db.models.enums import FundingStageEnum


class FundingRequest(Base):
    __tablename__ = funding_request

    id = Column(String, primary_key=True, index=True)
    business_id = Column(String, ForeignKey(business.id), nullable=False)

    amount_requested = Column(Integer, nullable=False)
    funding_stage = Column(Enum(FundingStageEnum), nullable=False)
    pitch_deck_url = Column(String, nullable=True)
    additional_info = Column(Text, nullable=True)

    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship(Business, back_populates=funding_requests)

