import json
import subprocess
import asyncio
from typing import Dict, Any, List
from app.config import settings

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
        Invoke chaincode function via peer CLI
        
        Args:
            function: Chaincode function name
            args: List of string arguments
        
        Returns:
            Transaction result
        """
        # Escape arguments for shell
        escaped_args = [arg.replace('"', '\\"') for arg in args]
        args_str = ', '.join([f'"{arg}"' for arg in escaped_args])
        
        # Build peer chaincode invoke command with both peers for endorsement
        command = (
            f'peer chaincode invoke '
            f'-C {self.channel} '
            f'-n {self.chaincode} '
            f'-c \'{{"function":"{function}","Args":[{args_str}]}}\' '
            f'--peerAddresses peer0.upps.akreditasi.local:7041 '
            f'--peerAddresses peer0.sekretariat.akreditasi.local:7061 '
            f'--waitForEvent'
        )
        
        result = await self._exec_peer_command(command)
        
        # Return success response
        return {
            "success": True,
            "message": "Transaction submitted successfully",
            "result": result
        }
    
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
        
        result = await self._exec_peer_command(command)
        
        # Parse result if it's a JSON string
        if result:
            try:
                return json.loads(result)
            except:
                return result
        return result
    
    async def create_submission(
        self,
        submission_id: str,
        program_studi: str,
        institusi: str,
        documents: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Create new submission"""
        return await self.invoke_chaincode(
            "CreateSubmission",
            [
                submission_id,
                program_studi,
                institusi,
                json.dumps(documents)
            ]
        )
    
    async def attach_ai_recommendation(
        self,
        submission_id: str,
        ai_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Attach AI recommendation to submission"""
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
