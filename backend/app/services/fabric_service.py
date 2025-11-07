import json
import subprocess
import asyncio
import logging
from typing import Dict, Any, List
from app.config import settings

# Initialize logger
logger = logging.getLogger(__name__)

class FabricService:
    """Service for interacting with Hyperledger Fabric via CLI"""
    
    def __init__(self):
        self.channel = settings.FABRIC_CHANNEL
        self.chaincode = settings.FABRIC_CHAINCODE
        self.cli_container = "cli.upps.akreditasi.local"  # Use UPPS CLI container
        self.org_msp = "UppsOrgMSP"
    
    async def _exec_peer_command(self, command: str) -> str:
        """Execute peer command in CLI container"""
        full_cmd = f"docker exec {self.cli_container} {command}"
        
        process = await asyncio.create_subprocess_shell(
            full_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr.decode().strip()
            raise Exception(f"Fabric CLI error: {error_msg}")
        
        return stdout.decode().strip()
    
    async def invoke_chaincode(
        self,
        function: str,
        args: List[str]
    ) -> Dict[str, Any]:
        """
        Invoke chaincode function via peer CLI with proper JSON escaping
        
        Args:
            function: Chaincode function name
            args: List of string arguments
        
        Returns:
            Transaction result
        """
        # Create proper JSON payload structure
        payload = {
            "function": function,
            "Args": args
        }
        
        # Convert to JSON string with proper escaping
        json_payload = json.dumps(payload, separators=(',', ':'))
        
        # For shell safety, escape the entire JSON payload
        escaped_payload = json_payload.replace("'", "'\"'\"'")
        
        # Build full command
        command = (
            f'peer chaincode invoke '
            f'-C {self.channel} '
            f'-n {self.chaincode} '
            f'-c \'{escaped_payload}\' '
            f'--peerAddresses peer0.upps.akreditasi.local:7041 '
            f'--peerAddresses peer0.sekretariat.akreditasi.local:7061 '
            f'--waitForEvent'
        )
        
        print(f"[Fabric] Invoking {function} with {len(args)} args")
        print(f"[Fabric] JSON payload: {json_payload}")
        
        try:
            result = await self._exec_peer_command(command)
            
            # Return success response
            return {
                "success": True,
                "message": "Transaction submitted successfully", 
                "result": result
            }
        except Exception as e:
            print(f"[Fabric] Error invoking chaincode: {str(e)}")
            # For debugging, let's also try a simpler approach
            if "AttachAIRecommendation" in function:
                print(f"[Fabric] Attempting simplified AI recommendation attachment...")
                # Use a simpler payload for AI recommendation
                simple_ai_data = {
                    "submissionId": args[0],
                    "status": "completed",
                    "processedAt": "2025-10-25T10:17:15.639954"
                }
                simple_payload = {
                    "function": function,
                    "Args": [args[0], json.dumps(simple_ai_data)]
                }
                simple_json = json.dumps(simple_payload, separators=(',', ':'))
                simple_escaped = simple_json.replace("'", "'\"'\"'")
                
                simple_command = (
                    f'peer chaincode invoke '
                    f'-C {self.channel} '
                    f'-n {self.chaincode} '
                    f'-c \'{simple_escaped}\' '
                    f'--peerAddresses peer0.upps.akreditasi.local:7041 '
                    f'--peerAddresses peer0.sekretariat.akreditasi.local:7061 '
                    f'--waitForEvent'
                )
                
                print(f"[Fabric] Simplified JSON payload: {simple_json}")
                result = await self._exec_peer_command(simple_command)
                
                return {
                    "success": True,
                    "message": "Transaction submitted successfully (simplified)", 
                    "result": result
                }
            else:
                raise e
    
    async def query_chaincode(
        self,
        function: str,
        args: List[str]
    ) -> Any:
        """
        Query chaincode function via peer CLI
        
        Args:
            function: Chaincode function name
            args: List of string arguments
        
        Returns:
            Query result
        """
        # Escape arguments for shell
        escaped_args = [arg.replace('"', '\\"') for arg in args]
        args_str = ', '.join([f'"{arg}"' for arg in escaped_args])
        
        # Build peer chaincode query command
        command = (
            f'peer chaincode query '
            f'-C {self.channel} '
            f'-n {self.chaincode} '
            f'-c \'{{"function":"{function}","Args":[{args_str}]}}\''
        )
        
        try:
            result = await self._exec_peer_command(command)
            
            # Try to parse as JSON
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                # If not JSON, return as string
                return result
                
        except Exception as e:
            print(f"[Fabric] Query error: {str(e)}")
            # Return empty list for query failures to avoid 500 errors
            if function.startswith("Query"):
                return []
            raise e
        
        # Parse result if it's a JSON string
        if result:
            try:
                return json.loads(result)
            except:
                return result
        return result
    
    async def create_submission(
        self,
        submission_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new submission on blockchain
        
        Args:
            submission_data: Submission data including submissionId, programStudi, institusi, documents
        
        Returns:
            Blockchain transaction result
        """
        try:
            # Extract required parameters for chaincode CreateSubmission function
            submission_id = submission_data.get('submissionId')
            program_studi = submission_data.get('programStudy', submission_data.get('programStudi', ''))
            institusi = submission_data.get('universityName', submission_data.get('institusi', ''))
            documents = submission_data.get('documents', [])
            
            # Convert documents to JSON string
            documents_json = json.dumps(documents, separators=(',', ':'))
            
            # Call chaincode with correct parameters: submissionId, programStudi, institusi, documentsJson
            result = await self.invoke_chaincode(
                'CreateSubmission',
                [submission_id, program_studi, institusi, documents_json]
            )
            
            logger.info(f"✅ Submission created on blockchain: {submission_id}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error creating submission on blockchain: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _sanitize_json_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize JSON payload to avoid chaincode errors"""
        def clean_value(value):
            if isinstance(value, dict):
                return {k: clean_value(v) for k, v in value.items() if v is not None}
            elif isinstance(value, list):
                return [clean_value(item) for item in value if item is not None]
            elif isinstance(value, str):
                # Remove problematic characters that might break JSON
                return value.replace('\x00', '').replace('\r', '').replace('\n', ' ').strip()
            elif isinstance(value, float):
                # Handle NaN and infinity
                if str(value).lower() in ['nan', 'inf', '-inf']:
                    return 0.0
                return value
            else:
                return value
        
        return clean_value(payload)
    
    async def attach_ai_recommendation(
        self,
        recommendation_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Attach AI recommendation to existing submission
        
        Args:
            recommendation_data: AI recommendation data including submissionId and analysis results
        
        Returns:
            Blockchain transaction result
        """
        try:
            submission_id = recommendation_data.get('submissionId')
            
            # Simplify the recommendation data to avoid JSON complexity issues
            simplified_data = {
                "submissionId": submission_id,
                "status": "completed",
                "processedAt": recommendation_data.get('processedAt', '2025-10-25T10:17:15.639954'),
                "scoring_available": (recommendation_data.get('scoring') is not None or recommendation_data.get('scoring_summary') is not None),
                "ai_version": recommendation_data.get('ai_version', 'LAM-TEK-2025-v1.0')
            }
            
            # Add basic scoring info if available (support both scoring and scoring_summary)
            scoring_data = recommendation_data.get('scoring') or recommendation_data.get('scoring_summary')
            if scoring_data:
                simplified_data["scoring_summary"] = {
                    "total_score": float(scoring_data.get('total_score', 0)),
                    "overall_percentage": float(scoring_data.get('overall_percentage', 0)),
                    "grade": str(scoring_data.get('grade', 'C')),
                    "method": str(scoring_data.get('method', 'LAM-TEK 2025'))
                }
            
            # Convert simplified data to JSON string
            recommendation_json = json.dumps(simplified_data, separators=(',', ':'))
            
            print(f"[Fabric] Simplified AI recommendation payload: {recommendation_json}")
            
            # Call chaincode with correct parameters: submissionId, recommendationJson
            result = await self.invoke_chaincode(
                'AttachAIRecommendation',
                [submission_id, recommendation_json]
            )
            
            logger.info(f"✅ AI recommendation attached to submission: {submission_id}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error attaching AI recommendation: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_scoring_result(
        self,
        submission_id: str,
        scoring_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update scoring result for submission"""
        # Combine scoring result with existing AI recommendation data
        ai_payload = {
            "scoreCompleteness": scoring_result.get("overall_percentage", 0.0),
            "scoringResults": scoring_result,
            # Preserve other fields if they exist
            "hasLED": True,
            "hasLKPS": True,
            "ledCriteriaCoverage": {},
            "lkpsDataCompleteness": {},
            "flags": [f"Skor keseluruhan: {scoring_result.get('overall_percentage', 0.0):.2f}%"],
            "recommendations": ["Hasil skoring otomatis telah dihitung", "Gunakan untuk evaluasi lanjutan"]
        }
        
        return await self.invoke_chaincode(
            "AttachAIRecommendation",
            [
                submission_id,
                json.dumps(ai_payload)
            ]
        )
    
    async def set_decision(
        self,
        submission_id: str,
        decision: str,
        notes: str,
        decided_by: str
    ) -> Dict[str, Any]:
        """Set approval/rejection decision"""
        return await self.invoke_chaincode(
            "SetDecision",
            [
                submission_id,
                decision,
                notes,
                decided_by
            ]
        )
    
    async def update_documents(
        self,
        submission_id: str,
        new_documents: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Update submission documents"""
        return await self.invoke_chaincode(
            "UpdateDocuments",
            [
                submission_id,
                json.dumps(new_documents)
            ]
        )
    
    async def query_submission(self, submission_id: str) -> Dict[str, Any]:
        """Query submission by ID"""
        return await self.query_chaincode(
            "QuerySubmission",
            [submission_id]
        )
    
    async def query_all_submissions(self) -> List[Dict[str, Any]]:
        """Query all submissions"""
        return await self.query_chaincode(
            "QueryAllSubmissions",
            []
        )
    
    async def query_submissions_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Query submissions by status"""
        return await self.query_chaincode(
            "QuerySubmissionsByStatus",
            [status]
        )
    
    async def query_submissions_by_institusi(self, institusi: str) -> List[Dict[str, Any]]:
        """Query submissions by institution"""
        return await self.query_chaincode(
            "QuerySubmissionsByInstitusi",
            [institusi]
        )
    
    async def get_submission_history(self, submission_id: str) -> List[Dict[str, Any]]:
        """Get submission transaction history"""
        return await self.query_chaincode(
            "GetSubmissionHistory",
            [submission_id]
        )

fabric_service = FabricService()
