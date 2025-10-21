from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
from datetime import datetime
import uuid
import httpx

from app.models import UploadResponse, Document, AIRecommendation
from app.services.pinata_service import pinata_service
from app.services.gemini_service import gemini_service
from app.services.fabric_service import fabric_service
from app.services.websocket_service import manager

router = APIRouter(prefix="/api/v1", tags=["submissions"])

@router.options("/upload")
async def upload_options():
    """Handle CORS preflight for upload endpoint"""
    return {"message": "OK"}

@router.get("/upload/test")
async def test_upload_endpoint():
    """Test endpoint to verify routing works"""
    return {"message": "Upload endpoint is reachable", "status": "OK"}

@router.post("/upload", response_model=UploadResponse)
async def upload_documents(
    programStudi: str = Form(...),
    institusi: str = Form(...),
    led_file: UploadFile = File(..., description="LED (Laporan Evaluasi Diri) - WAJIB"),
    lkps_file: UploadFile = File(..., description="LKPS (Laporan Kinerja Program Studi) - WAJIB"),
    additional_files: List[UploadFile] = File(default=[], description="Dokumen tambahan (opsional)")
):
    """
    Upload LED/LKPS documents with validation
    
    This endpoint:
    1. Validates LED and LKPS files using Gemini AI
    2. Uploads files to IPFS (Pinata)
    3. Runs completeness analysis (Gemini)
    4. Stores metadata in blockchain (Fabric)
    5. Emits real-time notification
    
    Required:
    - led_file: LED (Laporan Evaluasi Diri)
    - lkps_file: LKPS (Laporan Kinerja Program Studi)
    
    Optional:
    - additional_files: Supporting documents
    """
    try:
        print("\n" + "="*80)
        print(f"[Upload] NEW REQUEST RECEIVED")
        print(f"[Upload] Program Studi: {programStudi}")
        print(f"[Upload] Institusi: {institusi}")
        print(f"[Upload] LED File: {led_file.filename}")
        print(f"[Upload] LKPS File: {lkps_file.filename}")
        print("="*80 + "\n")
        
        # Generate submission ID
        submission_id = f"SUB-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        documents = []
        validated_documents = []
        
        # Emit progress: Step 1 started
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 1,
            "status": "processing",
            "message": "Memverifikasi LED..."
        })
        
        print(f"[Upload] Step 1: Verifying LED file...")
        # Step 1: Verify LED file (no IPFS upload yet)
        led_content = await led_file.read()
        print(f"[Upload] LED file read: {len(led_content)} bytes")
        
        led_verification = await gemini_service.verify_document_type(
            led_file.filename,
            led_content,
            "LED"
        )
        print(f"[Upload] LED verification result: {led_verification}")
        
        if not led_verification["isValid"] or led_verification["confidence"] < 0.7:
            raise HTTPException(
                status_code=400,
                detail=f"Dokumen LED tidak valid. {led_verification['reason']} (Confidence: {led_verification['confidence']:.0%})"
            )
        
        validated_documents.append({
            "type": "LED",
            "filename": led_file.filename,
            "content": led_content,
            "size_bytes": len(led_content),
            "verified": led_verification["isValid"],
            "confidence": led_verification["confidence"]
        })
        print(f"[Upload] ✓ LED verified successfully (size: {len(led_content)} bytes)")
        
        # Emit progress: Step 1 completed
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 1,
            "status": "completed",
            "message": "LED terverifikasi"
        })
        
        # Emit progress: Step 2 started
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 2,
            "status": "processing",
            "message": "Memverifikasi LKPS..."
        })
        
        print(f"[Upload] Step 2: Verifying LKPS file...")
        # Step 2: Verify LKPS file (no IPFS upload yet)
        lkps_content = await lkps_file.read()
        print(f"[Upload] LKPS file read: {len(lkps_content)} bytes")
        
        lkps_verification = await gemini_service.verify_document_type(
            lkps_file.filename,
            lkps_content,
            "LKPS"
        )
        print(f"[Upload] LKPS verification result: {lkps_verification}")
        
        if not lkps_verification["isValid"] or lkps_verification["confidence"] < 0.7:
            raise HTTPException(
                status_code=400,
                detail=f"Dokumen LKPS tidak valid. {lkps_verification['reason']} (Confidence: {lkps_verification['confidence']:.0%})"
            )
        
        validated_documents.append({
            "type": "LKPS",
            "filename": lkps_file.filename,
            "content": lkps_content,
            "size_bytes": len(lkps_content),
            "verified": lkps_verification["isValid"],
            "confidence": lkps_verification["confidence"]
        })
        print(f"[Upload] ✓ LKPS verified successfully (size: {len(lkps_content)} bytes)")
        
        # Emit progress: Step 2 completed
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 2,
            "status": "completed",
            "message": "LKPS terverifikasi"
        })
        
        print(f"[Upload] Step 3: Processing additional files...")
        # Step 3: Gather additional files (optional) for later upload
        for file in additional_files:
            if not file.filename:
                continue
            
            content = await file.read()
            if not content:
                continue
            
            validated_documents.append({
                "type": "ADDITIONAL",
                "filename": file.filename,
                "content": content,
                "verified": False,
                "confidence": 0.0
            })
        print(f"[Upload] ✓ {len(validated_documents)} total documents collected")
        
        # Emit progress: Step 3 started
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 3,
            "status": "processing",
            "message": "Analisis AI sedang berjalan..."
        })
        
        print(f"[Upload] Step 4: Running AI completeness analysis...")
        # Step 4: Run AI completeness analysis before uploading to IPFS
        documents_for_ai = [
            {
                "type": doc["type"],
                "filename": doc["filename"],
                "size_bytes": doc.get("size_bytes", 0),
                "size_mb": round(doc.get("size_bytes", 0) / (1024 * 1024), 2),
                "verified": doc["verified"],
                "confidence": doc["confidence"]
            }
            for doc in validated_documents
        ]
        
        print(f"[Upload] Extracting text from documents for AI analysis...")
        # Extract text content for deeper AI analysis
        file_contents = {}
        for doc in validated_documents:
            if doc["type"] == "LED":
                print(f"[Upload] Extracting text from LED PDF...")
                file_contents["LED"] = await gemini_service.extract_text_from_pdf(doc["content"]) \
                    if doc["filename"].lower().endswith('.pdf') else ""
                print(f"[Upload] LED text extracted: {len(file_contents['LED'])} chars")
            elif doc["type"] == "LKPS":
                print(f"[Upload] Extracting text from LKPS Excel...")
                file_contents["LKPS"] = await gemini_service.extract_text_from_excel(doc["content"]) \
                    if doc["filename"].lower().endswith(('.xlsx', '.xls')) else ""
                print(f"[Upload] LKPS text extracted: {len(file_contents['LKPS'])} chars")
        
        print(f"[Upload] Calling Gemini AI for analysis...")
        ai_result = await gemini_service.analyze_documents(
            program_studi=programStudi,
            institusi=institusi,
            documents=documents_for_ai,
            file_contents=file_contents
        )
        print(f"[Upload] ✓ AI analysis complete: LED={ai_result.get('hasLED')}, LKPS={ai_result.get('hasLKPS')}")
        
        # Emit progress: Step 3 completed
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 3,
            "status": "completed",
            "message": "Analisis AI selesai"
        })
        
        # Optional guard: ensure mandatory docs are acknowledged by AI response when available
        if ai_result.get("hasLED") is False or ai_result.get("hasLKPS") is False:
            raise HTTPException(
                status_code=400,
                detail="AI tidak menemukan LED dan LKPS pada paket dokumen. Mohon periksa kembali file yang diunggah."
            )
        
        # Emit progress: Step 4 started
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 4,
            "status": "processing",
            "message": "Mengupload ke IPFS..."
        })
        
        # Step 5: Upload only AI-validated documents to IPFS
        print(f"\n[Upload] Starting IPFS upload for {len([d for d in validated_documents if d['verified']])} verified documents...")
        
        for idx, doc in enumerate(validated_documents):
            if not doc["verified"]:
                continue
            
            print(f"[Upload] [{idx+1}] Uploading {doc['type']} - {doc['filename']} ({len(doc['content'])} bytes)")
            
            try:
                result = await pinata_service.upload_file(doc["content"], doc["filename"])
                doc.pop("content", None)
                documents.append({
                    "type": doc["type"],
                    "cid": result["cid"],
                    "hash": result["hash"],
                    "filename": doc["filename"],
                    "verified": doc["verified"],
                    "confidence": doc["confidence"]
                })
                print(f"[Upload] [{idx+1}] ✓ Success - CID: {result['cid']}")
            except Exception as e:
                print(f"[Upload] [{idx+1}] ✗ Failed: {str(e)}")
                raise HTTPException(
                    status_code=504,
                    detail=f"Gagal mengunggah {doc['type']} ({doc['filename']}) ke IPFS: {str(e)}"
                )
        
        print(f"[Upload] All IPFS uploads completed successfully!\n")
        
        # Emit progress: Step 4 completed
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 4,
            "status": "completed",
            "message": "Upload ke IPFS selesai"
        })
        
        # Emit progress: Step 5 started
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 5,
            "status": "processing",
            "message": "Menyimpan ke Blockchain..."
        })
        
        # Step 3: Create submission in blockchain
        try:
            await fabric_service.create_submission(
                submission_id=submission_id,
                program_studi=programStudi,
                institusi=institusi,
                documents=documents
            )
            
            # Step 4: Attach AI recommendation
            await fabric_service.attach_ai_recommendation(
                submission_id=submission_id,
                ai_payload=ai_result
            )
            
            # Emit progress: Step 5 completed
            await manager.emit_event("UploadProgress", {
                "submissionId": submission_id,
                "step": 5,
                "status": "completed",
                "message": "Berhasil disimpan ke Blockchain"
            })
            
        except (httpx.RequestError, httpx.HTTPStatusError) as fabric_error:
            error_detail = ""
            if isinstance(fabric_error, httpx.HTTPStatusError) and fabric_error.response is not None:
                error_detail = f" ({fabric_error.response.status_code} {fabric_error.response.text})"
            elif fabric_error.args:
                error_detail = f" ({fabric_error.args[0]})"
            
            print(f"Fabric integration error: {fabric_error}")
            raise HTTPException(
                status_code=502,
                detail=f"Dokumen terverifikasi sudah diunggah ke IPFS, namun gagal menyimpan ke Fabric{error_detail}"
            )
        
        # Step 5: Emit notification
        await manager.emit_event("SubmissionCreated", {
            "submissionId": submission_id,
            "programStudi": programStudi,
            "institusi": institusi,
            "at": datetime.now().isoformat()
        })
        
        return UploadResponse(
            submissionId=submission_id,
            status="under_review",
            documents=[Document(**doc) for doc in documents],
            ai=AIRecommendation(**ai_result)
        )
        
    except HTTPException:
        # Re-raise HTTPException as-is (validation errors)
        raise
    except Exception as e:
        # Log the full error for debugging
        import traceback
        print(f"ERROR in upload_documents: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
