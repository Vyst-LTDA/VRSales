# api/app/schemas/wall.py
from pydantic import BaseModel, Field
from typing import Optional, List

class WallBase(BaseModel):
    pos_x: int = Field(default=50)
    pos_y: int = Field(default=50)
    width: int = Field(default=200, gt=0)
    height: int = Field(default=10, gt=0)
    rotation: int = Field(default=0)
    wall_type: Optional[str] = Field(default='standard', max_length=50)

class WallCreate(WallBase):
    pass # Herda tudo da base

class WallUpdate(BaseModel):
    pos_x: Optional[int] = None
    pos_y: Optional[int] = None
    width: Optional[int] = Field(None, gt=0)
    height: Optional[int] = Field(None, gt=0)
    rotation: Optional[int] = None
    wall_type: Optional[str] = Field(None, max_length=50)

class Wall(WallBase):
    id: int
    store_id: int

    class Config:
        from_attributes = True

# Schema para atualizar layout de múltiplas paredes
class WallLayoutUpdate(BaseModel):
    id: int
    pos_x: int
    pos_y: int
    rotation: int