from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
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
    scoreCompleteness: float = Field(0.0, description="Skor kelengkapan dokumen")
    analyzedAt: Optional[str] = Field(None, description="Waktu analisis AI")
    # Full scoring data
    scoring: Optional[Dict[str, Any]] = Field(default=None, description="Hasil perhitungan skoring lengkap BAN-PT")
    scoring_analysis: Optional[Dict[str, Any]] = Field(default=None, description="Analisis scoring AI")
    scoring_error: Optional[str] = Field(default=None, description="Error scoring jika ada")

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
    version: int = 1  # Default value for backward compatibility
    ai: Optional[AIRecommendation] = None
    decision: Optional[Decision] = None
    createdAt: str
    updatedAt: str

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
