from pydantic import BaseModel
from typing import Optional, List

class FeedbackCreate(BaseModel):
    subject: str
    description: str
    image_data: Optional[List[str]] = None # --- AGORA É UMA LISTA ---

class FeedbackUpdateStatus(BaseModel):
    status: str