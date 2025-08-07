from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from libs.db.base import Base

class ValuationReport(Base):
    __tablename__ = 'valuation_reports'
    id = Column(Integer, primary_key=True, index=True)
    msme_id = Column(Integer, ForeignKey("msmes.id"))
    report_type = Column(String)
    report_data = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    msme = relationship("MSME", back_populates="valuation_reports")
