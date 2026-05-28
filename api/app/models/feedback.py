from sqlalchemy import String, Text, ForeignKey, Enum as SQLAlchemyEnum, DateTime, func, JSON # <-- Importe o JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List
import enum

from app.db.base import Base

class FeedbackStatus(str, enum.Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"

class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    store_id: Mapped[Optional[int]] = mapped_column(ForeignKey("stores.id"), nullable=True)
    
    subject: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # --- ALTERADO PARA JSON PARA SUPORTAR VÁRIAS IMAGENS ---
    image_data: Mapped[Optional[list]] = mapped_column(JSON, nullable=True) 
    
    status: Mapped[FeedbackStatus] = mapped_column(
        SQLAlchemyEnum(FeedbackStatus), 
        default=FeedbackStatus.OPEN, 
        nullable=False
    )
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    user: Mapped["User"] = relationship(lazy="selectin")
    store: Mapped[Optional["Store"]] = relationship(lazy="selectin")