# LAM-TEK 2025 – Local Setup Guide

Petunjuk ringkas menyalakan seluruh stack (PostgreSQL, backend Express, jaringan Fabric/Fablo, dan frontend Vite).

## Prasyarat
- Node.js 18+, npm 9+
- Docker & Docker Compose
- Fablo CLI (untuk jaringan Fabric) – https://github.com/hyperledger-labs/fablo

Direktori kerja: `~/blockchain-new`

## 1) Database PostgreSQL
```bash
cd backend-express
cp .env.example .env   # lalu isi JWT_SECRET, MSP_ENCRYPTION_KEY, dsb

# Nyalakan DB + seed (init-db.sql akan dieksekusi)
docker-compose -f docker-compose.db.yml up -d

# Cek tabel
docker exec postgres-akreditasi psql -U lamtek -d akreditasi -c "\dt"
```

Default user (password `admin123`, ganti di produksi):
- admin (role: admin, msp_org: OrdererMSP)
- upps_tip (role: upps, msp_org: UPPSMSP)
- sekretariat (role: sekretariat, msp_org: SekretariatMSP)
- assessor01 (role: assessor, msp_org: SekretariatMSP)

## 2) Jaringan Hyperledger Fabric (Fablo)
```bash
cd ~/blockchain-new

# Generate artefak baru (termasuk org Assessor)
fablo generate

# Jalankan jaringan
fablo up

# Deploy chaincode (policy sudah OR(UPPS,Sekretariat,Assessor))
fablo chaincode install
fablo chaincode approve
fablo chaincode commit
```
Pastikan container CLI tersedia: `cli.upps.akreditasi.local`, `cli.sekretariat.akreditasi.local`, `cli.assessor.akreditasi.local`.

## 3) Backend Express
```bash
cd backend-express
npm install

# Pastikan .env sudah diisi:
# - JWT_SECRET, MSP_ENCRYPTION_KEY (64 hex), DB_*, PINATA_*, GEMINI_*, FABRIC_CONNECTION_PROFILE, dsb.

npm run dev   # atau npm start
```
API base: `http://localhost:8000/api/v1`  
WS: `ws://localhost:8000/ws`

Autentikasi:
- `POST /auth/login` -> accessToken (Bearer) + refreshToken
- Sertakan header `Authorization: Bearer <accessToken>` untuk upload/submission/scoring/download.

## 4) Frontend (Vite React)
```bash
cd frontend
cp .env.example .env.local  # jika ada; jika tidak, set manual via export VITE_API_URL/VITE_WS_URL

# Set variabel:
# VITE_API_URL=http://localhost:8000/api/v1
# VITE_WS_URL=ws://localhost:8000/ws

npm install
npm run dev   # port default 5173
```
Login melalui `/login`, pilih role:
- UPPS/Admin -> dashboard utama
- Sekretariat -> `/sekretariat`
- Assessor -> `/assessor`

Token disimpan di localStorage (`token`, `user`).

## 5) Alur uji cepat
1. Login sebagai `upps_tip` (role upps) → upload LED/LKPS lewat UI; pastikan token dipakai.
2. Login sebagai `assessor01` → jalankan scoring via endpoint `POST /scoring/calculate`.
3. Login sebagai `sekretariat` → set keputusan via `POST /submissions/:id/decision`.
4. Unduh dokumen: `GET /download/:submissionId/LED` atau `.../LKPS` dengan bearer token.

## 6) Perintah util
```bash
# Hentikan DB
docker-compose -f backend-express/docker-compose.db.yml down

# Logs backend (dev)
tail -f backend-express/backend.log

# Cek status chaincode
docker ps --filter name=chaincode
```

## Catatan Keamanan
- Ganti `JWT_SECRET`, `MSP_ENCRYPTION_KEY`, password DB, dan seed password default sebelum produksi.
- Jangan commit nilai rahasia ke repo.***
