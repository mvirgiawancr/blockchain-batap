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
        print(f"[Submissions] Query params - status: {status}, institusi: {institusi}")
        
        if status:
            print(f"[Submissions] Querying by status: {status}")
            results = await fabric_service.query_submissions_by_status(status)
        elif institusi:
            print(f"[Submissions] Querying by institusi: {institusi}")
            results = await fabric_service.query_submissions_by_institusi(institusi)
        else:
            print(f"[Submissions] Querying all submissions")
            results = await fabric_service.query_all_submissions()
        
        print(f"[Submissions] Found {len(results)} submissions")
        
        # Transform blockchain data to match SubmissionResponse model
        transformed_results = []
        for r in results:
            try:
                # Transform documents to match expected format
                documents = []
                for doc in r.get('documents', []):
                    documents.append({
                        "type": doc.get('type', 'unknown'),
                        "cid": doc.get('ipfsHash', doc.get('cid', '')),
                        "hash": doc.get('ipfsHash', doc.get('hash', '')),
                        "filename": doc.get('filename', ''),
                        "verified": True,
                        "confidence": 1.0
                    })
                
                # Transform AI data to match expected format
                ai_data = r.get('ai', {})
                
                # Map scoring_summary from blockchain to scoring field for frontend
                scoring_data = ai_data.get('scoring_summary')
                if scoring_data:
                    # Transform scoring_summary to full scoring format expected by frontend
                    scoring_data = {
                        "total_score": scoring_data.get('total_score', 0),
                        "overall_percentage": scoring_data.get('overall_percentage', 0),
                        "grade": scoring_data.get('grade', 'C'),
                        "method": scoring_data.get('method', 'LAM-TEK 2025'),
                        "total_indicators": 0,  # Will be populated by real data
                        "results": []  # Will be populated by real data
                    }
                
                ai = {
                    "hasLED": True,  # Default values for blockchain data
                    "hasLKPS": True,
                    "ledCriteriaCoverage": {},
                    "lkpsDataCompleteness": {},
                    "flags": ai_data.get('flags', []),
                    "recommendations": ai_data.get('recommendations', []),
                    "scoreCompleteness": ai_data.get('scoreCompleteness', 0),
                    "analyzedAt": ai_data.get('analyzedAt'),
                    "scoring": scoring_data,  # Use mapped scoring data
                    "scoring_analysis": None,
                    "scoring_error": None
                }
                
                transformed = {
                    "submissionId": r.get('submissionId'),
                    "programStudi": r.get('programStudi'),
                    "institusi": r.get('institusi'),
                    "status": r.get('status'),
                    "version": r.get('version', 1),  # Add version with default value
                    "documents": documents,
                    "ai": ai,
                    "createdAt": r.get('createdAt'),
                    "updatedAt": r.get('updatedAt')
                }
                transformed_results.append(SubmissionResponse(**transformed))
            except Exception as transform_error:
                print(f"[Submissions] Transform error for submission {r.get('submissionId', 'unknown')}: {transform_error}")
                continue
                
        return transformed_results
    except Exception as e:
        print(f"[Submissions] Query error: {e}")
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
