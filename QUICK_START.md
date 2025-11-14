# 🎯 Quick Start - Deployment ke VPS

## File-file yang Sudah Dibuat:

✅ `backend-express/Dockerfile` - Docker image untuk backend Express
✅ `frontend/Dockerfile.production` - Docker image untuk frontend React (production build)
✅ `docker-compose.production.yml` - Orchestration untuk production
✅ `.env.production` - Environment variables untuk frontend
✅ `deploy.sh` - Script helper untuk deployment (EXECUTABLE)
✅ `DEPLOYMENT.md` - Dokumentasi lengkap deployment
✅ `.dockerignore` files - Untuk optimize Docker builds

## 🚀 Cara Deploy (3 Langkah Mudah):

### 1️⃣ Upload ke VPS
```bash
# Di komputer lokal
cd /home/virgi
tar --exclude='node_modules' --exclude='fablo-target' --exclude='.git' \
    -czf blockchain.tar.gz blockchain-new/
scp blockchain.tar.gz user@YOUR_VPS_IP:~/

# Di VPS
ssh user@YOUR_VPS_IP
tar -xzf blockchain.tar.gz
cd blockchain-new
```

### 2️⃣ Setup Environment
```bash
# Install prerequisites (Docker, Node.js, Fablo)
# Lihat detail di DEPLOYMENT.md

# Jalankan setup wizard
./deploy.sh setup
```

### 3️⃣ Deploy!
```bash
./deploy.sh start
```

## 📋 Script Commands:

```bash
./deploy.sh setup          # Setup wizard (konfigurasi awal)
./deploy.sh start          # Deploy semua (Fabric + Backend + Frontend)
./deploy.sh status         # Cek status dan URL
./deploy.sh logs           # Lihat logs semua service
./deploy.sh logs backend   # Lihat logs backend saja
./deploy.sh logs frontend  # Lihat logs frontend saja
./deploy.sh restart        # Restart services
./deploy.sh stop           # Stop semua
./deploy.sh update         # Update code & rebuild
```

## 🌐 Akses Setelah Deploy:

- Frontend: `http://YOUR_VPS_IP:3000`
- Backend: `http://YOUR_VPS_IP:8000`
- Health: `http://YOUR_VPS_IP:8000/health`

## ⚙️ Yang Perlu Disiapkan di VPS:

1. **Docker & Docker Compose** ← Install dulu
2. **Node.js 20** ← Install dulu
3. **Fablo** ← Install dulu
4. **Ports 3000 & 8000** ← Buka di firewall
5. **API Keys** ← Gemini & Pinata (opsional)

## 📖 Dokumentasi Lengkap:

Lihat `DEPLOYMENT.md` untuk:
- Langkah detail instalasi prerequisites
- Troubleshooting
- Security best practices
- Monitoring & maintenance
- Update procedures

---

**Pro Tip**: Jalankan `./deploy.sh setup` dulu untuk konfigurasi otomatis!
