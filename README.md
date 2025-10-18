# 🎓 Sistem Akreditasi Terdesentralisasi

> Blockchain-based Accreditation Management System with AI  
> **Tech Stack:** React + FastAPI + Hyperledger Fabric + IPFS + Google Gemini AI

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Sistem ini mengimplementasikan **PoC Fase 1** untuk manajemen akreditasi terdesentralisasi yang mencakup:

1. **Pendaftaran Dokumen** - Upload LED/LKPS ke IPFS
2. **Analisis AI** - Evaluasi kelengkapan dokumen menggunakan Gemini AI
3. **Pencatatan Blockchain** - Penyimpanan immutable di Hyperledger Fabric
4. **Verifikasi** - Approval/rejection oleh Sekretariat
5. **Notifikasi Real-time** - WebSocket untuk update status

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   React     │────▶│   FastAPI    │────▶│ Hyperledger    │
│  Frontend   │     │   Backend    │     │    Fabric      │
└─────────────┘     └──────────────┘     └────────────────┘
       │                    │                      │
       │                    ▼                      ▼
       │            ┌──────────────┐      ┌────────────────┐
       │            │ Gemini AI    │      │    CouchDB     │
       │            └──────────────┘      └────────────────┘
       │                    │
       └───────────────────▶│
                    ┌──────────────┐
                    │ IPFS/Pinata  │
                    └──────────────┘
```

### Component Roles

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React + Vite | User interface for UPPS & Sekretariat |
| **Backend** | FastAPI + Python | API layer & agent orchestration |
| **Blockchain** | Hyperledger Fabric | Immutable ledger for metadata |
| **Storage** | IPFS (Pinata) | Off-chain file storage |
| **AI** | Google Gemini | Document analysis |
| **Database** | CouchDB | Fabric world state |

---

## ✨ Features

### 🔐 Blockchain Integration
- Immutable document metadata storage
- Transaction history tracking
- Role-based access control

### 🤖 AI-Powered Analysis
- Automatic document completeness check
- Quality recommendations
- Intelligent flagging system

### 📁 Decentralized Storage
- IPFS file storage via Pinata
- Content-addressed retrieval
- SHA-256 integrity verification

### 🔔 Real-time Notifications
- WebSocket-based updates
- Event-driven architecture
- Live status changes

---

## 📦 Prerequisites

### Required Software

```bash
# Node.js (v18+)
node --version  # Should be >= 18.0.0

# Python (v3.9+)
python3 --version  # Should be >= 3.9

# Docker & Docker Compose (optional)
docker --version
docker-compose --version

# Fablo (for Fabric network)
# Installation: https://github.com/hyperledger-labs/fablo
fablo version
```

### API Keys

You'll need:
1. **Pinata JWT Token** - Get from [pinata.cloud](https://pinata.cloud)
2. **Google Gemini API Key** - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## 🚀 Installation

### 1. Clone Repository

```bash
cd /home/virgi/blockchain-new
```

### 2. Setup Hyperledger Fabric

```bash
# Deploy Fabric network with Fablo
fablo up

# This will:
# - Start orderer and peer nodes
# - Create 'akreditasi' channel
# - Deploy 'submission-contract' chaincode
```

### 3. Setup Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your API keys
nano .env
```

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit if needed
nano .env
```

### 5. Setup Chaincode

```bash
cd chaincode/submission-contract

# Install dependencies
npm install

# Build TypeScript
npm run build
```

---

## ⚙️ Configuration

### Backend Configuration (`.env`)

```env
# Pinata IPFS
PINATA_JWT=your_pinata_jwt_token_here
PINATA_BASE_URL=https://api.pinata.cloud

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-pro

# Hyperledger Fabric
FABLO_REST_BASE=http://localhost:8080
FABRIC_CHANNEL=akreditasi
FABRIC_CHAINCODE=submission-contract
FABRIC_ORG=org1
FABRIC_USER=admin

# Backend Settings
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=True

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend Configuration (`.env`)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

---

## 🏃 Running the Application

### Option 1: Manual Start

```bash
# Terminal 1: Start Fabric (if not running)
fablo up

# Terminal 2: Start Backend
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

### Option 2: Docker Compose

```bash
# Start all services
docker-compose up

# Or in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access the Application

- **Frontend (UPPS)**: http://localhost:3000
- **Frontend (Sekretariat)**: http://localhost:3000/sekretariat
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Fabric REST API**: http://localhost:8080

---

## 📚 API Documentation

### Upload Documents

```http
POST /api/v1/upload
Content-Type: multipart/form-data

programStudi: "Teknik Industri Pertanian (S2)"
institusi: "IPB University"
files: [LED.pdf, LKPS.xlsx]
```

**Response:**
```json
{
  "submissionId": "SUB-20251016-ABC123",
  "status": "under_review",
  "documents": [
    {
      "type": "LED",
      "cid": "bafy...",
      "hash": "SHA256:...",
      "filename": "LED.pdf"
    }
  ],
  "ai": {
    "scoreCompleteness": 0.93,
    "flags": [],
    "recommendations": []
  }
}
```

### Get Submissions

```http
GET /api/v1/submissions
GET /api/v1/submissions?status=under_review
GET /api/v1/submissions?institusi=IPB University
```

### Set Decision

```http
POST /api/v1/submissions/{submissionId}/decision

{
  "decision": "approved",  // or "rejected"
  "notes": "Semua dokumen lengkap dan valid",
  "decidedBy": "admin"
}
```

### WebSocket Events

```javascript
const ws = new WebSocket('ws://localhost:8000/ws?user_id=upps');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Event types:
  // - SubmissionCreated
  // - AIRecommendationAttached
  // - SubmissionDecided
  // - SubmissionDocumentsUpdated
};
```

---

## 📂 Project Structure

```
blockchain-new/
├── chaincode/                 # Hyperledger Fabric Chaincode (TypeScript)
│   ├── src/
│   │   ├── submission-contract.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                   # FastAPI Backend (Python)
│   ├── app/
│   │   ├── main.py           # Application entry point
│   │   ├── config.py         # Configuration
│   │   ├── models.py         # Pydantic models
│   │   ├── routers/          # API routes
│   │   │   ├── upload.py     # UploaderAgent
│   │   │   ├── submissions.py # VerifierAgent
│   │   │   └── websocket.py  # NotifierAgent
│   │   └── services/         # Business logic
│   │       ├── pinata_service.py    # IPFS/Pinata
│   │       ├── gemini_service.py    # AI Analysis
│   │       ├── fabric_service.py    # Blockchain
│   │       └── websocket_service.py # WebSocket
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── main.jsx          # Entry point
│   │   ├── App.jsx           # Main app component
│   │   ├── components/       # Reusable components
│   │   │   └── Navbar.jsx
│   │   ├── pages/            # Page components
│   │   │   ├── UPPSDashboard.jsx
│   │   │   └── SekretariatDashboard.jsx
│   │   └── services/         # API clients
│   │       ├── api.js
│   │       └── websocket.js
│   ├── package.json
│   └── vite.config.js
│
├── fablo-config.json         # Fabric network configuration
├── docker-compose.yml        # Docker orchestration
├── techspec.md              # Technical specification
└── README.md                # This file
```

---

## 🔍 Troubleshooting

### Fabric Network Issues

```bash
# Check if Fabric is running
docker ps | grep hyperledger

# Restart Fabric network
fablo down
fablo up

# Check chaincode logs
fablo chaincode logs submission-contract
```

### Backend Issues

```bash
# Check if backend is running
curl http://localhost:8000/health

# View backend logs
tail -f backend/*.log

# Test Pinata connection
curl -H "Authorization: Bearer YOUR_JWT" \
  https://api.pinata.cloud/data/testAuthentication
```

### Frontend Issues

```bash
# Clear node modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Check if backend is accessible
curl http://localhost:8000/health
```

### Common Errors

**"Module not found" in chaincode**
```bash
cd chaincode
npm install
npm run build
```

**"Cannot connect to WebSocket"**
- Ensure backend is running
- Check CORS settings in backend
- Verify WebSocket URL in frontend .env

**"IPFS upload failed"**
- Verify PINATA_JWT is correct
- Check Pinata dashboard for rate limits
- Ensure file size is under limits

---

## 🧪 Testing

### Test Backend

```bash
cd backend
source venv/bin/activate

# Manual test upload
curl -X POST http://localhost:8000/api/v1/upload \
  -F "programStudi=Test Program" \
  -F "institusi=Test Institution" \
  -F "files=@test.pdf"
```

### Test Chaincode

```bash
# Query chaincode via Fablo REST
curl -X POST http://localhost:8080/query/akreditasi/submission-contract \
  -H "Content-Type: application/json" \
  -d '{
    "function": "QueryAllSubmissions",
    "args": [],
    "org": "org1",
    "user": "admin"
  }'
```

---

## 📝 Development Notes

### Adding New Chaincode Functions

1. Edit `chaincode/src/submission-contract.ts`
2. Rebuild: `npm run build`
3. Redeploy: `fablo chaincode upgrade submission-contract`

### Adding New API Endpoints

1. Create router in `backend/app/routers/`
2. Add to `main.py`: `app.include_router(your_router)`
3. Restart backend

### Adding New Frontend Pages

1. Create component in `frontend/src/pages/`
2. Add route in `App.jsx`
3. Update Navbar if needed

---

## 🤝 Contributing

This is a PoC project for Phase 1. For production deployment, consider:

- [ ] Authentication & authorization
- [ ] Rate limiting
- [ ] Enhanced error handling
- [ ] Comprehensive testing
- [ ] Monitoring & logging
- [ ] Performance optimization
- [ ] Security audit

---

## 📄 License

This project is part of an academic/research initiative.

---

## 👥 Team

**Sistem Akreditasi Terdesentralisasi - PoC Fase 1**

For questions or issues, please refer to the technical specification in `techspec.md`.

---

**Happy Coding! 🚀**
