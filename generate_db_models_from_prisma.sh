#!/bin/bash

set -e

MODELS_DIR="libs/db/models"

mkdir -p "$MODELS_DIR"

declare -A models



models["bank_account.py"]="""from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from uuid import uuid4
from datetime import datetime
from libs.db.base import Base


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_number = Column(String, nullable=False)
    ifsc_code = Column(String, nullable=False)
    bank_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="bank_accounts")
"""
models["address.py"]="""from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from uuid import uuid4
from datetime import datetime
from libs.db.base import Base


class Address(Base):
    __tablename__ = "addresses"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    street = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    postal_code = Column(String, nullable=False)
    country = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="addresses")
"""
models["document.py"]='(PASTE document.py HERE)'
models["kyc.py"]="""from sqlalchemy import Column, String, ForeignKey, DateTime, Enum as SqlEnum
from sqlalchemy.orm import relationship
from libs.db.base import Base
import enum
import uuid
from datetime import datetime

class KYCStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class KYC(Base):
    __tablename__ = "kycs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    pan_number = Column(String, nullable=False, unique=True)
    aadhar_number = Column(String, nullable=False, unique=True)
    gst_number = Column(String, nullable=True)
    status = Column(SqlEnum(KYCStatus), default=KYCStatus.PENDING)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="kyc")
"""
models["loan_application.py"]="""from sqlalchemy import Column, String, Float, Enum as SqlEnum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from libs.db.base import Base
from datetime import datetime
import enum
import uuid

class LoanStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DISBURSED = "DISBURSED"

class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    business_id = Column(String, ForeignKey("businesses.id"), nullable=False)
    amount = Column(Float, nullable=False)
    tenure_months = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=True)
    status = Column(SqlEnum(LoanStatus), default=LoanStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="loan_applications")
    business = relationship("Business", back_populates="loan_applications")
"""
#models["product.py"]='(PASTE product.py HERE)'
#models["invoice.py"]='(PASTE invoice.py HERE)'
models["transaction.py"]="""from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from libs.db.base_class import Base

class Transaction(Base):
    __tablename__ = "transaction"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    loan_id = Column(UUID(as_uuid=True), ForeignKey("loan.id"), nullable=False)
    amount = Column(Numeric, nullable=False)
    transaction_type = Column(String, nullable=False)  # DEBIT / CREDIT
    created_at = Column(DateTime, default=datetime.utcnow)

    loan = relationship("Loan", back_populates="transactions")
"""
#models["repayment.py"]='(PASTE repayment.py HERE)'
models["audit_log.py"]="""from sqlalchemy import Column, String, DateTime, JSON
from uuid import uuid4
from datetime import datetime
from libs.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    action = Column(String, nullable=False)
    performed_by = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(JSON, nullable=True)
"""
models["notification.py"]="""from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func, Text
from sqlalchemy.dialects.postgresql import UUID
from libs.db.base_class import Base
import uuid

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
"""

models["otp_code.py"]="""from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
from libs.db.base import Base

class OTPCode(Base):
    __tablename__ = 'otp_codes'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    phone_number = Column(String, nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))

    user = relationship('User', back_populates='otp_codes')
"""
models["profile.py"]="""from sqlalchemy import Column, String, Date, Enum as PgEnum, ForeignKey
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
"""
models["business_details.py"]="""from sqlalchemy import Column, String, Enum as PgEnum, ForeignKey
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
"""
models["valuation_request.py"]="""from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from libs.db.base import Base
from libs.shared.enums import ValuationStatusEnum


class ValuationRequest(Base):
    __tablename__ = "valuation_request"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    business_id = Column(UUID(as_uuid=True), ForeignKey("business.id"), nullable=False)

    status = Column(Enum(ValuationStatusEnum), default=ValuationStatusEnum.PENDING)
    report_url = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="valuation_requests")
"""
models["investor.py"]="""from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from libs.db.base_class import Base
from datetime import datetime


class Investor(Base):
    __tablename__ = "investor"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("user.id"), nullable=False)

    company_name = Column(String, nullable=True)
    website = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="investor")
"""
models["funding_request.py"]="""from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from libs.db.base_class import Base
from datetime import datetime
from libs.db.models.enums import FundingStageEnum


class FundingRequest(Base):
    __tablename__ = "funding_request"

    id = Column(String, primary_key=True, index=True)
    business_id = Column(String, ForeignKey("business.id"), nullable=False)

    amount_requested = Column(Integer, nullable=False)
    funding_stage = Column(Enum(FundingStageEnum), nullable=False)
    pitch_deck_url = Column(String, nullable=True)
    additional_info = Column(Text, nullable=True)

    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="funding_requests")
"""
models["api_key.py"]="""from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from libs.db.base_class import Base
import uuid

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String, unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
"""
for filename in "${!models[@]}"; do
  echo "Generating $MODELS_DIR/$filename"
  echo "${models[$filename]}" > "$MODELS_DIR/$filename"
done

echo "✅ All model files generated in $MODELS_DIR"
