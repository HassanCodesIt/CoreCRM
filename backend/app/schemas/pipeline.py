from pydantic import BaseModel
from typing import Optional, List

class PipelineStageBase(BaseModel):
    name: str
    order: int
    probability: float
    is_closed_won: bool = False
    is_closed_lost: bool = False

class PipelineStageCreate(PipelineStageBase):
    pass

class PipelineStageRead(PipelineStageBase):
    id: str
    pipeline_id: str

    class Config:
        from_attributes = True

class PipelineBase(BaseModel):
    name: str
    is_default: bool = False
    currency: str = "USD"
    rotting_days: int = 14

class PipelineCreate(PipelineBase):
    stages: List[PipelineStageCreate] = []

class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    is_default: Optional[bool] = None
    currency: Optional[str] = None
    rotting_days: Optional[int] = None

class PipelineRead(PipelineBase):
    id: str
    tenant_id: str
    stages: List[PipelineStageRead]

    class Config:
        from_attributes = True
