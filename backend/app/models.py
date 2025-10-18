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
    scoreCompleteness: int = Field(..., ge=0, le=4, description="Skor akreditasi: 0=Tidak Terakreditasi, 1=C, 2=B, 3=A, 4=Unggul")
    flags: List[str] = []
    recommendations: Optional[List[str]] = []

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
