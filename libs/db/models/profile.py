from sqlalchemy import Column, String, Date, Enum as PgEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from uuid import uuid4
from libs.db.base import Base
import enum

class GenderEnum(str, enum.Enum):
    MALE = 'MALE'
    FEMALE = 'FEMALE'
    OTHER = 'OTHER'

class Profile(Base):
    __tablename__ = 'profiles'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), unique=True)
    full_name = Column(String, nullable=True)
    gender = Column(PgEnum(GenderEnum), nullable=True)
    dob = Column(Date, nullable=True)
    pan = Column(String, nullable=True)

    user = relationship('User', back_populates='profile')

