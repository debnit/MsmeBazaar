from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
from libs.db.base import Base

class OTPCode(Base):
    __tablename__ = 'otp_codes'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    phone_number = Column(String, nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))

    user = relationship('User', back_populates='otp_codes')

