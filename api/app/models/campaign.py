from sqlalchemy import String, Integer, ForeignKey, DateTime, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional

from app.db.base import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    target_audience: Mapped[str] = mapped_column(String(50), nullable=False) # ex: 'inactive_30_days'
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Status: 'draft', 'scheduled', 'sent', 'failed'
    status: Mapped[str] = mapped_column(String(20), default="draft")
    
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())