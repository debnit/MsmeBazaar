from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from uuid import uuid4
from datetime import datetime
from libs.db.base import Base


class Address(Base):
    __tablename__ = addresses

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey(users.id), nullable=False)

    street = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    postal_code = Column(String, nullable=False)
    country = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship(User, back_populates=addresses)

