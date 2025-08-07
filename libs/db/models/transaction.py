from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from libs.db.base_class import Base

class Transaction(Base):
    __tablename__ = transaction

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    loan_id = Column(UUID(as_uuid=True), ForeignKey(loan.id), nullable=False)
    amount = Column(Numeric, nullable=False)
    transaction_type = Column(String, nullable=False)  # DEBIT / CREDIT
    created_at = Column(DateTime, default=datetime.utcnow)

    loan = relationship(Loan, back_populates=transactions)

