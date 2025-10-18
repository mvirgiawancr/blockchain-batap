from fastapi import APIRouter, HTTPException, Path
from typing import List
from datetime import datetime

from app.models import DecisionRequest, SubmissionResponse, ErrorResponse
from app.services.fabric_service import fabric_service
from app.services.websocket_service import manager

router = APIRouter(prefix="/api/v1/submissions", tags=["submissions"])

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(submission_id: str = Path(...)):
    """Get submission by ID"""
    try:
        result = await fabric_service.query_submission(submission_id)
        return SubmissionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Submission not found: {str(e)}")

@router.get("/", response_model=List[SubmissionResponse])
async def get_all_submissions(
    status: str = None,
    institusi: str = None
):
    """Get all submissions with optional filters"""
    try:
        if status:
            results = await fabric_service.query_submissions_by_status(status)
        elif institusi:
            results = await fabric_service.query_submissions_by_institusi(institusi)
        else:
            results = await fabric_service.query_all_submissions()
        
        return [SubmissionResponse(**r) for r in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@router.post("/{submission_id}/decision", response_model=SubmissionResponse)
async def set_decision(
    submission_id: str = Path(...),
    request: DecisionRequest = ...
):
    """
    Set approval/rejection decision for a submission
    
    This endpoint is used by VerifierAgent (Sekretariat)
    """
    try:
        # Validate decision
        if request.decision not in ["approved", "rejected"]:
            raise HTTPException(
                status_code=400,
                detail="Decision must be 'approved' or 'rejected'"
            )
        
        # Set decision in blockchain
        await fabric_service.set_decision(
            submission_id=submission_id,
            decision=request.decision,
            notes=request.notes,
            decided_by=request.decidedBy or "admin"
        )
        
        # Emit notification
        await manager.emit_event("SubmissionDecided", {
            "submissionId": submission_id,
            "status": request.decision,
            "at": datetime.now().isoformat()
        })
        
        # Get updated submission
        result = await fabric_service.query_submission(submission_id)
        return SubmissionResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decision update failed: {str(e)}")

@router.post("/{submission_id}/documents", response_model=SubmissionResponse)
async def update_documents(
    submission_id: str = Path(...),
    # TODO: Add file upload logic similar to /upload endpoint
):
    """
    Update submission documents (revision)
    
    This creates a new version of the submission
    """
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.get("/{submission_id}/history")
async def get_submission_history(submission_id: str = Path(...)):
    """Get full transaction history for a submission"""
    try:
        history = await fabric_service.get_submission_history(submission_id)
        return {"submissionId": submission_id, "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"History query failed: {str(e)}")
