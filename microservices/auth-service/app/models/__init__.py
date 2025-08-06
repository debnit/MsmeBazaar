# app/models/__init__.py
from app.utils.db import Base
from app.models.user import User
# If you have OTP or sessions tables in auth-service, import them too:
# from app.models.otp_code import OTPCode
# from app.models.session import Session

__all__ = ["Base", "User"]
