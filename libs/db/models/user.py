from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
import enum
from libs.db.base import Base


class RoleEnum(str, enum.Enum):
    MSME = "MSME"
    BUYER = "BUYER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)   
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=True)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.MSME)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    kyc = relationship("KYC", uselist=False, back_populates="user")
    otp_codes = relationship('OTPCode', back_populates='user')
    profile = relationship('Profile', uselist=False, back_populates='user')
    businesses = relationship('Business', back_populates='user')
    addresses = relationship("Address", back_populates="user", cascade="all, delete")


