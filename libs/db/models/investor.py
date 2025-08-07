from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from libs.db.base_class import Base
from datetime import datetime


class Investor(Base):
    __tablename__ = investor

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey(user.id), nullable=False)

    company_name = Column(String, nullable=True)
    website = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship(User, back_populates=investor)

