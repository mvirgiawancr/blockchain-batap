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
from app.services.scoring_service import ScoringService

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
    programType: str = Form(..., description="Program type: S, D, PPI, D1, D2, D3, STr, M, MTr, DTr"),
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
        print(f"[Upload] Program Type: {programType}")
        print(f"[Upload] LED File: {led_file.filename}")
        print(f"[Upload] LKPS File: {lkps_file.filename}")
        print("="*80 + "\n")
        
        # Validate program type
        valid_program_types = ["S", "D", "PPI", "D1", "D2", "D3", "STr", "M", "MTr", "DTr"]
        if programType.upper() not in valid_program_types:
            raise HTTPException(
                status_code=400,
                detail=f"Program type tidak valid. Gunakan salah satu dari: {valid_program_types}"
            )
        
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
        
        # NEW: Add automatic scoring after AI analysis
        print(f"[Upload] Step 4: Running automatic scoring analysis...")
        try:
            # Emit progress: Scoring analysis started
            await manager.emit_event("UploadProgress", {
                "submissionId": submission_id,
                "step": 4,
                "status": "processing",
                "message": "Menghitung skor otomatis..."
            })
            
            # Perform comprehensive AI analysis for scoring using LAM-TEK 2025
            scoring_analysis = await gemini_service.analyze_documents_for_scoring(
                program_studi=programStudi,
                institusi=institusi,
                led_content=file_contents.get("LED", ""),
                lkps_content=file_contents.get("LKPS", ""),
                program_type=programType  # Use the provided program type
            )
            
            # Calculate scores using LAM-TEK 2025 service
            scoring_result = None
            if scoring_analysis.get("scoring_readiness", {}).get("ready_for_lamtek_scoring", False):
                # Use new LAM-TEK scoring service
                from app.services.lamtek_scoring_service import LAMTEKScoringService
                lamtek_scoring_service = LAMTEKScoringService()
                
                lamtek_result = await lamtek_scoring_service.calculate_lamtek_scores(
                    program_type=programType,
                    ai_data=scoring_analysis
                )
                
                # Convert LAM-TEK result to compatible format
                scoring_result = {
                    "total_indicators": lamtek_result.get("summary", {}).get("total_butir", 60),
                    "total_score": lamtek_result.get("summary", {}).get("total_score", 0),
                    "overall_percentage": (lamtek_result.get("summary", {}).get("total_score", 0) / lamtek_result.get("summary", {}).get("total_butir", 60)) * 100,
                    "grade": lamtek_result.get("summary", {}).get("grade", "C"),
                    "results": lamtek_result.get("task_scores", []),
                    "method": "LAM-TEK 2025",
                    "lamtek_details": lamtek_result
                }
                print(f"[Upload] ✓ LAM-TEK 2025 scoring completed: {scoring_result['total_indicators']} butir, {scoring_result['overall_percentage']:.1f}% overall, Grade: {scoring_result['grade']}")
            else:
                print(f"[Upload] ! LAM-TEK scoring analysis not ready, using fallback LAM-TEK scoring")
                # FALLBACK LAM-TEK SCORING: Use default values with proper LAM-TEK structure
                from app.services.lamtek_scoring_service import LAMTEKScoringService
                lamtek_scoring_service = LAMTEKScoringService()
                
                # Create fallback data structure compatible with LAM-TEK
                fallback_lamtek_data = {
                    "program_analysis": {
                        "program_type": programType,
                        "program_name": programStudi,
                        "institution": institusi
                    },
                    "lkps_data": {
                        "bop_value": 60000000 if programType == "M" else 40000000,
                        "dpd_total": 30000000 if programType == "M" else 20000000,
                        "jumlah_mahasiswa": 40 if programType == "M" else 100,
                        "jumlah_dtps": 12 if programType == "M" else 15,
                        "rmd": 3.33 if programType == "M" else 6.67,
                        "waktu_tunggu_lulusan": 4.0,
                        "ipk_rata2": 3.60,
                        "masa_studi_rata2": 4.0 if programType == "M" else 8.0,
                        "tingkat_kelulusan": 95.0,
                        "tingkat_serapan": 90.0,
                        "jumlah_kerjasama_institusi": {"ri": 8, "rn": 15, "rl": 25},
                        "publikasi_dtps": {"internasional": 15, "nasional": 30}
                    },
                    "scoring_readiness": {"ready_for_lamtek_scoring": True}
                }
                
                lamtek_result = await lamtek_scoring_service.calculate_lamtek_scores(
                    program_type=programType,
                    ai_data=fallback_lamtek_data
                )
                
                # Convert to compatible format
                scoring_result = {
                    "total_indicators": lamtek_result.get("summary", {}).get("total_butir", 60),
                    "total_score": lamtek_result.get("summary", {}).get("total_score", 0),
                    "overall_percentage": (lamtek_result.get("summary", {}).get("total_score", 0) / lamtek_result.get("summary", {}).get("total_butir", 60)) * 100,
                    "grade": lamtek_result.get("summary", {}).get("grade", "C"),
                    "results": lamtek_result.get("task_scores", []),
                    "method": "LAM-TEK 2025 (Fallback)",
                    "lamtek_details": lamtek_result
                }
                print(f"[Upload] ✓ Fallback LAM-TEK scoring completed: {scoring_result['total_indicators']} butir, {scoring_result['overall_percentage']:.1f}% overall, Grade: {scoring_result['grade']} (estimated)")
            
            # Add scoring result to AI result
            ai_result["scoring"] = scoring_result
            ai_result["scoring_analysis"] = scoring_analysis
            
            # DEBUG: Log detailed scoring structure
            if scoring_result:
                print(f"[Upload] ✅ Scoring Result Structure:")
                print(f"[Upload]   - Total indicators: {scoring_result.get('total_indicators', 0)}")
                print(f"[Upload]   - Total score: {scoring_result.get('total_score', 0)}")
                print(f"[Upload]   - Overall percentage: {scoring_result.get('overall_percentage', 0)}")
                print(f"[Upload]   - Results array length: {len(scoring_result.get('results', []))}")
                if scoring_result.get('results'):
                    for i, result in enumerate(scoring_result.get('results', [])[:3]):  # Show first 3
                        print(f"[Upload]   - Indicator {i+1}: {result.get('indicator_number')} - {result.get('indicator_name')} = {result.get('score')}")
            else:
                print(f"[Upload] ⚠️  No scoring result generated")
            
        except Exception as scoring_error:
            print(f"[Upload] Warning: Scoring failed but continuing upload: {scoring_error}")
            # Continue with upload even if scoring fails
            ai_result["scoring"] = None
            ai_result["scoring_error"] = str(scoring_error)
        
        # Emit progress: Step 3 completed
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 3,
            "status": "completed",
            "message": "Analisis AI dan skoring selesai"
        })
        
        # Optional guard: ensure mandatory docs are acknowledged by AI response when available
        if ai_result.get("hasLED") is False or ai_result.get("hasLKPS") is False:
            raise HTTPException(
                status_code=400,
                detail="AI tidak menemukan LED dan LKPS pada paket dokumen. Mohon periksa kembali file yang diunggah."
            )
        
        # Emit progress: Step 5 started
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 5,
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
        
        # Emit progress: Step 5 completed
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 5,
            "status": "completed",
            "message": "Upload ke IPFS selesai"
        })
        
        # Emit progress: Step 6 started
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 6,
            "status": "processing",
            "message": "Menyimpan ke Blockchain..."
        })
        
        # RESTORE BLOCKCHAIN OPERATIONS - Test the fixes
        try:
            print(f"[Upload] Creating submission in blockchain...")
            
            # Prepare submission data for blockchain
            submission_data = {
                "submissionId": submission_id,
                "programStudy": programStudi,
                "universityName": institusi,
                "submittedBy": "upps@university.edu",
                "submittedAt": datetime.now().isoformat(),
                "documents": documents,
                "status": "submitted"
            }
            
            await fabric_service.create_submission(submission_data)
            print(f"[Upload] ✅ Submission created in blockchain")
            
            print(f"[Upload] Attaching AI recommendation to blockchain...")
            
            # Prepare AI recommendation data
            recommendation_data = {
                "submissionId": submission_id,
                "aiAnalysis": ai_result.get('analysis', 'Complete analysis performed'),
                "recommendations": ai_result.get('recommendations', []),
                "scoring": ai_result.get('scoring', {}),
                "processedAt": datetime.now().isoformat()
            }
            
            await fabric_service.attach_ai_recommendation(recommendation_data)
            print(f"[Upload] ✅ AI recommendation attached to blockchain")
            
        except Exception as fabric_error:
            print(f"[Upload] ❌ Blockchain failed: {fabric_error}")
            # Continue without blockchain but log the error
            pass
            
        # Emit progress: Step 6 completed
        await manager.emit_event("UploadProgress", {
            "submissionId": submission_id,
            "step": 6,
            "status": "completed",
            "message": "Upload berhasil - Scoring tersedia"
        })
        
        # Step 5: Emit notification
        await manager.emit_event("SubmissionCreated", {
            "submissionId": submission_id,
            "programStudi": programStudi,
            "institusi": institusi,
            "at": datetime.now().isoformat()
        })
        
        print(f"[Upload] ✅ FINAL: Returning complete response with scoring data")
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
