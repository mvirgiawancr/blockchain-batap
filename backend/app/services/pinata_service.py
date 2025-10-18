import httpx
import hashlib
import io
from typing import Dict, Any, Optional
from app.config import settings

class PinataService:
    """Service for interacting with Pinata IPFS"""
    
    def __init__(self):
        # Use official Pinata API endpoint
        self.api_url = "https://api.pinata.cloud"
        self.gateway_url = f"https://{settings.PINATA_BASE_URL.replace('https://', '').replace('http://', '')}"
        self.jwt_token = settings.PINATA_JWT
        self.headers = {
            "Authorization": f"Bearer {self.jwt_token}"
        }
        self.timeout = httpx.Timeout(
            connect=settings.PINATA_CONNECT_TIMEOUT,
            read=settings.PINATA_READ_TIMEOUT,
            write=settings.PINATA_READ_TIMEOUT,
            pool=5.0
        )
    
    async def upload_file(self, file_content: bytes, filename: str) -> Dict[str, str]:
        """
        Upload file to IPFS via Pinata
        Returns: {"cid": "...", "hash": "SHA256:..."}
        """
        import json
        
        print(f"[Pinata] Starting upload for {filename} ({len(file_content)} bytes)")
        
        # Calculate SHA-256 hash
        file_hash = hashlib.sha256(file_content).hexdigest()
        
        # Upload to Pinata using official API
        url = f"{self.api_url}/pinning/pinFileToIPFS"
        
        # Prepare metadata
        metadata = {
            "name": filename,
            "keyvalues": {
                "sha256": file_hash
            }
        }
        
        # Prepare the multipart form data
        files = {
            'file': (filename, io.BytesIO(file_content), 'application/octet-stream')
        }
        
        data = {
            "pinataMetadata": json.dumps(metadata),
            "pinataOptions": json.dumps({"cidVersion": 1})
        }
        
        print(f"[Pinata] Uploading to {url}...")
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    url,
                    headers=self.headers,
                    files=files,
                    data=data
                )
                response.raise_for_status()
                result = response.json()
                
                print(f"[Pinata] Upload successful! CID: {result['IpfsHash']}")
                
                return {
                    "cid": result["IpfsHash"],
                    "hash": f"SHA256:{file_hash}"
                }
            except httpx.ConnectError as e:
                print(f"[Pinata] Connection error: {str(e)}")
                raise Exception("Tidak dapat terhubung ke layanan IPFS (Pinata). Periksa koneksi jaringan atau kredensial Pinata.")
            except httpx.TimeoutException as e:
                print(f"[Pinata] Timeout error: {str(e)}")
                raise Exception("Upload ke Pinata melebihi batas waktu. Koneksi mungkin lambat atau layanan tidak tersedia.")
            except httpx.HTTPStatusError as e:
                # Log detailed error for debugging
                print(f"[Pinata] API Error: {e.response.status_code}")
                print(f"[Pinata] Response: {e.response.text}")
                raise Exception(f"Failed to upload to Pinata: {e.response.text}")
            except Exception as e:
                print(f"[Pinata] Unexpected error: {str(e)}")
                raise
    
    async def get_file(self, cid: str) -> bytes:
        """Retrieve file from IPFS"""
        # Use the custom gateway from settings or default Pinata gateway
        gateway_url = f"{self.gateway_url}/ipfs/{cid}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(gateway_url, timeout=60.0)
            response.raise_for_status()
            return response.content
    
    async def verify_file_integrity(self, cid: str, expected_hash: str) -> bool:
        """Verify file integrity by comparing hashes"""
        try:
            file_content = await self.get_file(cid)
            actual_hash = f"SHA256:{hashlib.sha256(file_content).hexdigest()}"
            return actual_hash == expected_hash
        except Exception:
            return False

pinata_service = PinataService()
