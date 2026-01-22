# 🚀 Panduan Deployment dengan Coolify

Panduan lengkap untuk deploy aplikasi AkreChain menggunakan Coolify di VPS.

## Arsitektur Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS                                  │
│                                                              │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │   Fablo (Manual)        │  │   Coolify (Auto-Deploy)  │  │
│  │   ───────────────       │  │   ────────────────────   │  │
│  │   • peer0.org1          │  │   • Frontend (Nginx:80)  │  │
│  │   • orderer             │◄─┤   • Backend (Node:8000)  │  │
│  │   • ca.org1             │  │   • PostgreSQL (:5432)   │  │
│  │   • couchdb             │  │                          │  │
│  └─────────────────────────┘  └──────────────────────────┘  │
│                                                              │
│  Akses:                                                      │
│  • http://<IP-VPS>        → Frontend                        │
│  • http://<IP-VPS>:8000   → Backend API                     │
│  • http://<IP-VPS>:8080   → Coolify Dashboard              │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Install Coolify di VPS

SSH ke VPS Anda:
```bash
ssh user@<IP-VPS>
```

Install Coolify:
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Setelah selesai, akses Coolify Dashboard:
```
http://<IP-VPS>:8080
```

Buat akun admin pertama Anda.

---

## Step 2: Hubungkan GitHub

1. Buka **Settings** → **Sources** → **Add New Source**
2. Pilih **GitHub App**
3. Ikuti wizard untuk authorize GitHub
4. Pilih repository `blockchain-new`

---

## Step 3: Setup Fablo/Hyperledger Fabric (Manual)

> ⚠️ **PENTING**: Fablo tetap dijalankan manual karena kompleksitas blockchain network.

```bash
# Clone repo ke VPS
cd /home/user
git clone <your-repo-url> blockchain-new
cd blockchain-new

# Jalankan Fablo
chmod +x fablo
./fablo up
```

Pastikan network berjalan:
```bash
docker ps | grep peer
```

---

## Step 4: Deploy PostgreSQL via Coolify

1. **Projects** → **Create New Project** → Name: `AkreChain`
2. **+ New Resource** → **Databases** → **PostgreSQL**
3. Konfigurasi:
   - **Version**: `15`
   - **Database Name**: `akreditasi`
   - **Username**: `lamtek`
   - **Password**: `<your-secure-password>`
4. Klik **Deploy**

Catat **Internal URL**: `postgres-xxxx` (nama container)

---

## Step 5: Deploy Backend

1. **+ New Resource** → **Application** → **Docker Image (Dockerfile)**
2. Pilih repository GitHub → Branch: `main`
3. Konfigurasi:
   - **Base Directory**: `/backend-express`
   - **Dockerfile Location**: `Dockerfile`
   - **Port Exposes**: `8000`

4. **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=8000
   
   # Database - gunakan nama container PostgreSQL
   DB_HOST=postgres-xxxx
   DB_PORT=5432
   DB_NAME=akreditasi
   DB_USER=lamtek
   DB_PASSWORD=<your-db-password>
   
   # CORS - sesuaikan dengan IP VPS
   CORS_ORIGINS=http://<IP-VPS>,http://<IP-VPS>:80
   
   # Gemini AI
   GEMINI_API_KEY=<your-gemini-key>
   GEMINI_MODEL=gemini-1.5-flash
   
   # JWT
   JWT_SECRET=<your-secure-jwt-secret>
   JWT_EXPIRY=24h
   
   # Fabric - path relatif dari dalam container
   FABRIC_MSP_ID=sekretariatMSP
   FABRIC_WALLET_PATH=/app/wallet
   FABRIC_CONNECTION_PROFILE=/fablo-target/fabric-config/connection-profiles/connection-profile-sekretariat.json
   FABRIC_CHANNEL_NAME=akreditasi
   FABRIC_CHAINCODE_NAME=submission-contract
   FABRIC_USER_ID=admin
   FABRIC_USER_SECRET=adminpw
   
   # Encryption
   MSP_ENCRYPTION_KEY=<your-64-char-hex-key>
   ```

5. **Volumes/Mounts** (di Advanced settings):
   ```
   /home/user/blockchain-new/fablo-target:/fablo-target:ro
   ```

6. **Docker Network** (di Advanced settings):
   - Add external network: `fablo-target_basic`

7. Enable **Auto Deploy** → Klik **Deploy**

---

## Step 6: Deploy Frontend dengan Nginx

1. **+ New Resource** → **Application** → **Docker Image (Dockerfile)**
2. Pilih repository GitHub → Branch: `main`
3. Konfigurasi:
   - **Base Directory**: `/frontend`
   - **Dockerfile Location**: `Dockerfile.nginx`
   - **Port Exposes**: `80`

4. **Build Arguments**:
   ```
   VITE_API_BASE_URL=http://<IP-VPS>:8000/api/v1
   VITE_WS_URL=ws://<IP-VPS>:8000
   ```

5. **Port Mappings**:
   - Map port `80` ke host port `80`

6. Enable **Auto Deploy** → Klik **Deploy**

---

## Verifikasi Deployment

### Frontend
```bash
curl http://<IP-VPS>
# Harus return HTML
```

### Backend
```bash
curl http://<IP-VPS>:8000/health
# Harus return: {"status":"ok",...}
```

### Database
Di Coolify, buka PostgreSQL → **Logs** untuk cek status

---

## Auto-Deploy dari GitHub

Setiap kali Anda `git push` ke branch `main`:
1. Coolify otomatis detect perubahan
2. Build ulang Docker image
3. Deploy container baru
4. Zero-downtime deployment

---

## Troubleshooting

### Backend tidak bisa connect ke Fabric
```bash
# Cek network
docker network ls | grep fablo

# Pastikan backend container terhubung
docker network connect fablo-target_basic <backend-container-name>
```

### Frontend tidak bisa akses API
- Pastikan CORS_ORIGINS di backend sudah include IP VPS
- Cek firewall: `ufw allow 80` dan `ufw allow 8000`

### Database connection failed
- Pastikan nama container PostgreSQL benar
- Cek internal network Coolify

---

## Files yang Ditambahkan

| File | Deskripsi |
|------|-----------|
| `frontend/Dockerfile.nginx` | Dockerfile untuk build frontend dengan Nginx |
| `frontend/nginx.conf` | Konfigurasi Nginx production-ready |
| `COOLIFY_DEPLOYMENT.md` | Dokumentasi ini |
