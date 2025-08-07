from sqlalchemy import Column, String, ForeignKey, DateTime, Enum as SqlEnum
from sqlalchemy.orm import relationship
from libs.db.base import Base
import enum
import uuid
from datetime import datetime

class KYCStatus(str, enum.Enum):
    PENDING = PENDING
    VERIFIED = VERIFIED
    REJECTED = REJECTED

class KYC(Base):
    __tablename__ = kycs

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey(users.id), nullable=False)
    pan_number = Column(String, nullable=False, unique=True)
    aadhar_number = Column(String, nullable=False, unique=True)
    gst_number = Column(String, nullable=True)
    status = Column(SqlEnum(KYCStatus), default=KYCStatus.PENDING)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    user = relationship(User, back_populates=kyc)

