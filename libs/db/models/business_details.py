from sqlalchemy import Column, String, Enum as PgEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from uuid import uuid4
from libs.db.base import Base
import enum

class BusinessTypeEnum(str, enum.Enum):
    SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP'
    PARTNERSHIP = 'PARTNERSHIP'
    PRIVATE_LIMITED = 'PRIVATE_LIMITED'
    PUBLIC_LIMITED = 'PUBLIC_LIMITED'
    LLP = 'LLP'

class Business(Base):
    __tablename__ = 'businesses'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    business_name = Column(String, nullable=False)
    type = Column(PgEnum(BusinessTypeEnum), nullable=True)
    gstin = Column(String, nullable=True)

    user = relationship('User', back_populates='businesses')
    documents = relationship('Document', back_populates='business')

