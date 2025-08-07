from sqlalchemy import Column, String, Float, Enum as SqlEnum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from libs.db.base import Base
from datetime import datetime
import enum
import uuid

class LoanStatus(str, enum.Enum):
    PENDING = PENDING
    APPROVED = APPROVED
    REJECTED = REJECTED
    DISBURSED = DISBURSED

class LoanApplication(Base):
    __tablename__ = loan_applications

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey(users.id), nullable=False)
    business_id = Column(String, ForeignKey(businesses.id), nullable=False)
    amount = Column(Float, nullable=False)
    tenure_months = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=True)
    status = Column(SqlEnum(LoanStatus), default=LoanStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship(User, back_populates=loan_applications)
    business = relationship(Business, back_populates=loan_applications)

