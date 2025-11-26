from pydantic import BaseModel, validator, Field
from typing import Optional, List
from app.schemas.enums import TableStatus, TableShape
from datetime import datetime

class TableBase(BaseModel):
    number: str
    capacity: int = Field(4, gt=0)
    shape: TableShape = TableShape.RECTANGLE

class TableCreate(TableBase):
    pos_x: Optional[int] = 0
    pos_y: Optional[int] = 0

class TableUpdate(BaseModel):
    number: Optional[str] = None
    status: Optional[TableStatus] = None
    capacity: Optional[int] = Field(None, gt=0)
    shape: Optional[TableShape] = None
    rotation: Optional[int] = None

class SimpleTable(TableBase):
    id: int
    status: TableStatus
    pos_x: Optional[int] = 0
    pos_y: Optional[int] = 0
    rotation: Optional[int] = 0
    store_id: int

    class Config:
        from_attributes = True

class Table(TableBase):
    id: int
    status: TableStatus
    pos_x: Optional[int] = 0
    pos_y: Optional[int] = 0
    rotation: Optional[int] = 0
    store_id: int
    
    open_order_id: Optional[int] = None
    open_order_created_at: Optional[datetime] = None
    has_ready_items: bool = False

    class Config:
        from_attributes = True

    @validator('status', pre=True)
    def status_to_lowercase(cls, v):
        if isinstance(v, str):
            return v.lower()
        return v

class TableLayoutUpdate(BaseModel):
    id: int
    pos_x: int
    pos_y: int
    # Adicionamos rotation ao layout para salvar a orientação
    rotation: Optional[int] = None

class TableLayoutUpdateRequest(BaseModel):
    tables: List[TableLayoutUpdate]