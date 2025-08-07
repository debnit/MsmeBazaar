# payment_models.py
# Auto-generated SQLAlchemy model for payment-service

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, Text
from sqlalchemy.orm import relationship, declarative_base
import datetime

Base = declarative_base()

class PaymentModel(Base):
    __tablename__ = 'payments'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Add more fields and relationships as per your schema
