from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CampaignBase(BaseModel):
    name: str
    target_audience: str
    message: str
    send_date: Optional[datetime] = None

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(CampaignBase):
    status: Optional[str] = None

class Campaign(CampaignBase):
    id: int
    store_id: int
    status: str
    created_at: datetime
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True