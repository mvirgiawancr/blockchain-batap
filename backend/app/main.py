from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import upload, submissions, websocket

app = FastAPI(
    title="Accreditation System API",
    description="Blockchain-based Accreditation Management System with AI",
    version="1.0.0"
)

print(f"[CORS] Allowed origins: {settings.cors_origins_list}")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    print(f"\n[Request] {request.method} {request.url}")
    print(f"[Request] Headers: {dict(request.headers)}")
    print(f"[Request] Client: {request.client}")
    response = await call_next(request)
    print(f"[Response] Status: {response.status_code}")
    return response

# Include routers
app.include_router(upload.router)
app.include_router(submissions.router)
app.include_router(websocket.router)

@app.get("/")
async def root():
    return {
        "message": "Accreditation System API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "pinata": settings.PINATA_JWT != "",
            "gemini": settings.GEMINI_API_KEY != "",
            "fabric": settings.FABLO_REST_BASE != ""
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.DEBUG
    )
