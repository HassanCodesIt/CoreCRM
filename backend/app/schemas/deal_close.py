from pydantic import BaseModel
from typing import Optional, List


class DealCloseRequest(BaseModel):
    status: str
    reason_category: Optional[str] = None
    reason_notes: Optional[str] = None
    amount_final: Optional[float] = None


class VelocityStageAverage(BaseModel):
    stage_id: str
    stage_name: str
    avg_days: float


class VelocityPipelineResponse(BaseModel):
    pipeline_id: str
    pipeline_name: str
    stages: List[VelocityStageAverage]


class VelocityResponse(BaseModel):
    pipelines: List[VelocityPipelineResponse]


class FunnelStageData(BaseModel):
    stage_id: str
    stage_name: str
    count: int
    conversion_rate: Optional[float] = None


class FunnelPipelineResponse(BaseModel):
    pipeline_id: str
    pipeline_name: str
    stages: List[FunnelStageData]


class FunnelResponse(BaseModel):
    pipeline_id: str
    stages: List[FunnelStageData]
