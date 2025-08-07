from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from uuid import uuid4
from datetime import datetime
from libs.db.base import Base


class BankAccount(Base):
    __tablename__ = bank_accounts

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey(users.id), nullable=False)
    account_number = Column(String, nullable=False)
    ifsc_code = Column(String, nullable=False)
    bank_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship(User, back_populates=bank_accounts)

