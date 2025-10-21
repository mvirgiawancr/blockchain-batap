from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Document(BaseModel):
    type: str
    cid: str
    hash: str
    filename: Optional[str] = None
    verified: bool = False
    confidence: float = Field(0.0, ge=0, le=1)

class AIRecommendation(BaseModel):
    hasLED: bool = Field(..., description="LED terdeteksi dan valid")
    hasLKPS: bool = Field(..., description="LKPS terdeteksi dan valid")
    ledCriteriaCoverage: dict = Field(default_factory=dict, description="Coverage 9 kriteria akreditasi")
    lkpsDataCompleteness: dict = Field(default_factory=dict, description="Kelengkapan data LKPS")
    flags: List[str] = Field(default_factory=list, description="Temuan/observasi dari analisis")
    recommendations: List[str] = Field(default_factory=list, description="Rekomendasi perbaikan")

class Decision(BaseModel):
    result: str  # "approved" or "rejected"
    notes: str
    decidedBy: str
    decidedAt: str

class UploadRequest(BaseModel):
    programStudi: str
    institusi: str

class UploadResponse(BaseModel):
    submissionId: str
    status: str
    documents: List[Document]
    ai: AIRecommendation

class DecisionRequest(BaseModel):
    decision: str  # "approved" or "rejected"
    notes: str
    decidedBy: Optional[str] = "admin"

class SubmissionResponse(BaseModel):
    submissionId: str
    programStudi: str
    institusi: str
    documents: List[Document]
    status: str
    version: int
    ai: Optional[AIRecommendation] = None
    decision: Optional[Decision] = None
    createdAt: str
    updatedAt: str

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
