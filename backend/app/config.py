import base64
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Pinata Configuration
    PINATA_JWT: str = ""
    PINATA_BASE_URL: str = "https://api.pinata.cloud"
    PINATA_CONNECT_TIMEOUT: float = 10.0
    PINATA_READ_TIMEOUT: float = 60.0
    
    # Gemini AI Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-pro"
    
    # Hyperledger Fabric Configuration
    FABLO_REST_BASE: str = "http://localhost:8080"
    FABRIC_CHANNEL: str = "akreditasi"
    FABRIC_CHAINCODE: str = "submission-contract"
    FABRIC_CONTRACT: str = "SubmissionContract"
    FABRIC_ORG: str = "org1"
    FABRIC_USER: str = "admin"
    FABRIC_AUTH_TYPE: str = "basic"
    FABRIC_AUTH_USERNAME: str = "admin"
    FABRIC_AUTH_PASSWORD: str = "adminpw"
    FABRIC_AUTH_TOKEN: str = ""
    
    # Backend Configuration
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    DEBUG: bool = True
    
    # CORS Configuration
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # JWT Configuration
    JWT_SECRET_KEY: str = "your_secret_key_here_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def fabric_auth_header(self) -> Optional[str]:
        auth_type = (self.FABRIC_AUTH_TYPE or "").lower()
        
        if auth_type in ("", "none"):
            return None
        
        if auth_type == "basic":
            if not self.FABRIC_AUTH_USERNAME or not self.FABRIC_AUTH_PASSWORD:
                return None
            credentials = f"{self.FABRIC_AUTH_USERNAME}:{self.FABRIC_AUTH_PASSWORD}"
            encoded = base64.b64encode(credentials.encode("utf-8")).decode("utf-8")
            return f"Basic {encoded}"
        
        token = self.FABRIC_AUTH_TOKEN or self.FABRIC_AUTH_PASSWORD
        if not token:
            return None
        
        if auth_type == "bearer":
            return f"Bearer {token}"
        
        return f"{self.FABRIC_AUTH_TYPE} {token}"

settings = Settings()
