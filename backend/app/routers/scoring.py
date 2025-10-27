from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional
from datetime import datetime
import uuid
import httpx
import json

from app.models import UploadResponse, Document, AIRecommendation
from app.services.pinata_service import pinata_service
from app.services.gemini_service import gemini_service
from app.services.fabric_service import fabric_service
from app.services.websocket_service import manager
from app.services.scoring_service import ScoringService

router = APIRouter(prefix="/api/v1", tags=["scoring"])

@router.options("/auto-score")
async def auto_score_options():
    """Handle CORS preflight for auto-score endpoint"""
    return {"message": "OK"}

@router.post("/auto-score")
async def auto_score_documents(
    programStudi: str = Form(...),
    institusi: str = Form(...),
    programType: str = Form(...),  # S, D, PPI, D1, D2, D3, STr, M, MTr, DTr
    led_file: UploadFile = File(..., description="LED (Laporan Evaluasi Diri) - WAJIB"),
    lkps_file: UploadFile = File(..., description="LKPS (Laporan Kinerja Program Studi) - WAJIB"),
):
    """
    Automatically score LED/LKPS documents using Gemini AI and scoring algorithms
    
    This endpoint:
    1. Validates LED and LKPS files
    2. Extracts data using Gemini AI with context engineering
    3. Calculates scores using implemented scoring algorithms
    4. Stores results in database
    5. Emits real-time notification
    """
    try:
        print("\n" + "="*80)
        print(f"[AutoScore] NEW SCORING REQUEST RECEIVED")
        print(f"[AutoScore] Program Studi: {programStudi}")
        print(f"[AutoScore] Program Type: {programType}")
        print(f"[AutoScore] Institusi: {institusi}")
        print(f"[AutoScore] LED File: {led_file.filename}")
        print(f"[AutoScore] LKPS File: {lkps_file.filename}")
        print("="*80 + "\n")
        
        # Validate program type
        valid_program_types = ["S", "D", "PPI", "D1", "D2", "D3", "STr", "M", "MTr", "DTr"]
        if programType.upper() not in valid_program_types:
            raise HTTPException(
                status_code=400,
                detail=f"Program type tidak valid. Gunakan salah satu dari: {valid_program_types}"
            )
        
        # Generate scoring ID
        scoring_id = f"SCORE-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Emit progress: Step 1 started
        await manager.emit_event("ScoringProgress", {
            "scoringId": scoring_id,
            "step": 1,
            "status": "processing",
            "message": "Mengekstrak teks dari dokumen..."
        })
        
        print(f"[AutoScore] Step 1: Extracting text from documents...")
        
        # Read and extract text from both files
        led_content = await led_file.read()
        lkps_content = await lkps_file.read()
        
        print(f"[AutoScore] LED file read: {len(led_content)} bytes")
        print(f"[AutoScore] LKPS file read: {len(lkps_content)} bytes")
        
        # Extract text based on file types
        led_text = ""
        lkps_text = ""
        
        if led_file.filename.lower().endswith('.pdf'):
            led_text = await gemini_service.extract_text_from_pdf(led_content)
        elif led_file.filename.lower().endswith(('.docx', '.doc')):
            # For now, we'll handle other formats as needed
            led_text = led_content.decode('utf-8', errors='ignore')[:10000]  # Limit for safety
        else:
            led_text = led_content.decode('utf-8', errors='ignore')[:10000]
        
        if lkps_file.filename.lower().endswith('.pdf'):
            lkps_text = await gemini_service.extract_text_from_pdf(lkps_content)
        elif lkps_file.filename.lower().endswith(('.xlsx', '.xls')):
            lkps_text = await gemini_service.extract_text_from_excel(lkps_content)
        elif lkps_file.filename.lower().endswith(('.docx', '.doc')):
            lkps_text = lkps_content.decode('utf-8', errors='ignore')[:10000]
        else:
            lkps_text = lkps_content.decode('utf-8', errors='ignore')[:10000]
        
        print(f"[AutoScore] LED text extracted: {len(led_text)} chars")
        print(f"[AutoScore] LKPS text extracted: {len(lkps_text)} chars")
        
        # Emit progress: Step 2 started
        await manager.emit_event("ScoringProgress", {
            "scoringId": scoring_id,
            "step": 2,
            "status": "processing",
            "message": "Analisis AI sedang berjalan..."
        })
        
        print(f"[AutoScore] Step 2: Running AI analysis for scoring...")
        
        # Use Gemini AI to extract data for scoring
        ai_analysis = await gemini_service.analyze_documents_for_scoring(
            program_studi=programStudi,
            institusi=institusi,
            led_content=led_text,
            lkps_content=lkps_text,
            program_type=programType
        )
        
        print(f"[AutoScore] AI analysis completed, ready for scoring: {ai_analysis.get('scoring_readiness', {}).get('ready_for_scoring', False)}")
        
        # Check if analysis was successful
        if not ai_analysis.get("scoring_readiness", {}).get("ready_for_scoring", False):
            raise HTTPException(
                status_code=500,
                detail=f"AI analysis gagal: {ai_analysis.get('scoring_readiness', {}).get('recommendation', 'Tidak dapat mengekstrak data')}"
            )
        
        # Emit progress: Step 3 started
        await manager.emit_event("ScoringProgress", {
            "scoringId": scoring_id,
            "step": 3,
            "status": "processing",
            "message": "Menghitung skor otomatis..."
        })
        
        print(f"[AutoScore] Step 3: Calculating scores...")
        
        # Calculate scores using the scoring service
        scoring_service = ScoringService()
        
        # Prepare document content for scoring
        document_content = {
            "led_data": ai_analysis.get("led_data", {}),
            "lkps_data": ai_analysis.get("lkps_data", {}),
            "program_type": programType
        }
        
        # Calculate complete scoring
        scoring_result = scoring_service.calculate_complete_scoring(document_content)
        
        print(f"[AutoScore] Scoring completed. Total indicators: {scoring_result['total_indicators']}, Overall percentage: {scoring_result['overall_percentage']:.2f}%")
        
        # Prepare data for storage
        scoring_data = {
            "scoringId": scoring_id,
            "submissionId": f"SUB-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}",
            "programStudi": programStudi,
            "institusi": institusi,
            "programType": programType,
            "scoringResult": scoring_result,
            "aiAnalysis": ai_analysis,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "status": "completed"
        }
        
        # Upload scoring results to IPFS
        print(f"[AutoScore] Step 4: Uploading scoring results to IPFS...")
        
        # Convert scoring data to JSON string for IPFS storage
        scoring_json = json.dumps(scoring_data, ensure_ascii=False)
        scoring_bytes = scoring_json.encode('utf-8')
        
        try:
            result = await pinata_service.upload_file(scoring_bytes, f"scoring_result_{scoring_id}.json")
            scoring_data["scoring_cid"] = result["cid"]
            scoring_data["scoring_hash"] = result["hash"]
            print(f"[AutoScore] ✓ Scoring results uploaded to IPFS - CID: {result['cid']}")
        except Exception as e:
            print(f"[AutoScore] ✗ Failed to upload scoring results to IPFS: {str(e)}")
            raise HTTPException(
                status_code=504,
                detail=f"Gagal mengunggah hasil skoring ke IPFS: {str(e)}"
            )
        
        # Emit progress: Step 4 completed
        await manager.emit_event("ScoringProgress", {
            "scoringId": scoring_id,
            "step": 4,
            "status": "completed",
            "message": "Upload ke IPFS selesai"
        })
        
        # Store scoring result in blockchain (Fabric)
        print(f"[AutoScore] Step 5: Storing scoring result in blockchain...")
        
        try:
            # Create submission in blockchain with scoring data
            await fabric_service.create_submission(
                submission_id=scoring_data["submissionId"],
                program_studi=programStudi,
                institusi=institusi,
                documents=[{
                    "type": "SCORING_RESULT",
                    "cid": result["cid"],
                    "hash": result["hash"],
                    "filename": f"scoring_result_{scoring_id}.json",
                    "verified": True,
                    "confidence": 1.0
                }]
            )
            
            # Update scoring result in blockchain
            await fabric_service.update_scoring_result(
                submission_id=scoring_data["submissionId"],
                scoring_result=scoring_result
            )
            
            print(f"[AutoScore] ✓ Scoring result stored in blockchain")
            
        except (httpx.RequestError, httpx.HTTPStatusError) as fabric_error:
            error_detail = ""
            if isinstance(fabric_error, httpx.HTTPStatusError) and fabric_error.response is not None:
                error_detail = f" ({fabric_error.response.status_code} {fabric_error.response.text})"
            elif fabric_error.args:
                error_detail = f" ({fabric_error.args[0]})"
            
            print(f"[AutoScore] Fabric integration error: {fabric_error}")
            raise HTTPException(
                status_code=502,
                detail=f"Hasil skoring dihitung, namun gagal menyimpan ke Fabric{error_detail}"
            )
        
        # Emit completion notification
        await manager.emit_event("ScoringCompleted", {
            "scoringId": scoring_id,
            "programStudi": programStudi,
            "institusi": institusi,
            "overallPercentage": scoring_result['overall_percentage'],
            "totalIndicators": scoring_result['total_indicators'],
            "at": datetime.now().isoformat()
        })
        
        # Return comprehensive scoring result
        return {
            "scoringId": scoring_id,
            "submissionId": scoring_data["submissionId"],
            "programStudi": programStudi,
            "institusi": institusi,
            "programType": programType,
            "scoringResult": scoring_result,
            "dataQuality": ai_analysis.get("data_extraction_quality", {}),
            "scoringCid": result["cid"],
            "status": "completed",
            "createdAt": scoring_data["createdAt"]
        }
        
    except HTTPException:
        # Re-raise HTTPException as-is (validation errors)
        raise
    except Exception as e:
        # Log the full error for debugging
        import traceback
        print(f"ERROR in auto_score_documents: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Auto scoring failed: {str(e)}")


@router.get("/scoring/{scoring_id}")
async def get_scoring_result(scoring_id: str):
    """
    Retrieve scoring result by ID
    """
    try:
        # This would typically retrieve from the blockchain or database
        # For now, we'll return a placeholder
        print(f"[AutoScore] Retrieving scoring result for ID: {scoring_id}")
        
        # In a real implementation, this would query the blockchain/Fabric
        # or a database to retrieve the scoring result
        return {
            "error": "Scoring result retrieval not fully implemented",
            "scoringId": scoring_id,
            "message": "This endpoint needs to be connected to the blockchain query service"
        }
    except Exception as e:
        import traceback
        print(f"ERROR in get_scoring_result: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to retrieve scoring result: {str(e)}")