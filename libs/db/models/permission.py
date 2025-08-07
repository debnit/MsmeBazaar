from sqlalchemy import Column, Integer, String, ForeignKey
from libs.db.base import Base

class Permission(Base):
    __tablename__ = 'permissions'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    resource = Column(String, nullable=False)
    action = Column(String, nullable=False)
