# 🚀 Panduan Deployment LAM-TEK 2025 ke VPS

Panduan lengkap untuk deploy aplikasi Blockchain Akreditasi LAM-TEK 2025 ke VPS.

## 📋 Arsitektur

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│  React Frontend │◄────────│  Express Backend │◄────────│ Hyperledger Fabric  │
│  (Port 3000)    │         │  (Port 8000)     │         │  (Fablo)            │
└─────────────────┘         └──────────────────┘         └─────────────────────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                   ┌──────▼──────┐      ┌──────▼──────┐
                   │  Gemini AI  │      │ Pinata IPFS │
                   └─────────────┘      └─────────────┘
```

## ⚙️ Requirements VPS

### Spesifikasi Minimum:
- **OS**: Ubuntu 20.04 atau lebih baru
- **RAM**: 8GB (recommended 16GB)
- **Storage**: 50GB
- **CPU**: 4 cores
- **Network**: Port 22, 3000, 8000 terbuka

### Software yang Dibutuhkan:
- Docker & Docker Compose
- Node.js 20.x
- Fablo (untuk Hyperledger Fabric)

## 🔧 Langkah 1: Persiapan VPS

### 1.1 Login ke VPS
```bash
ssh user@YOUR_VPS_IP
```

### 1.2 Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

**PENTING**: Logout dan login kembali setelah install Docker!

### 1.3 Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

### 1.4 Install Fablo
```bash
sudo curl -Lf https://github.com/hyperledger-labs/fablo/releases/download/2.3.0/fablo.sh -o /usr/local/bin/fablo
sudo chmod +x /usr/local/bin/fablo

# Verify
fablo version
```

### 1.5 Konfigurasi Firewall
```bash
# Allow SSH, Frontend, dan Backend
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw enable
sudo ufw status
```

## 📦 Langkah 2: Upload Project

### Option A: Via Git (Recommended)
```bash
cd ~
git clone https://github.com/mvirgiawancr/blockchain-batap.git
cd blockchain-batap
```

### Option B: Via SCP
```bash
# Di komputer lokal
cd /home/virgi
tar --exclude='node_modules' \
    --exclude='fablo-target' \
    --exclude='backend-express/wallet' \
    --exclude='.git' \
    -czf blockchain.tar.gz blockchain-new/

# Upload
scp blockchain.tar.gz user@YOUR_VPS_IP:~/

# Di VPS
cd ~
tar -xzf blockchain.tar.gz
cd blockchain-new
```

## 🔐 Langkah 3: Konfigurasi Environment

### 3.1 Jalankan Setup Wizard
```bash
cd ~/blockchain-new
chmod +x deploy.sh
./deploy.sh setup
```

Setup wizard akan:
- Mendeteksi IP VPS Anda
- Membuat file `.env` jika belum ada
- Update CORS configuration
- Meminta API keys (Gemini & Pinata)

### 3.2 Manual Configuration (Optional)

Jika ingin konfigurasi manual, edit file berikut:

**backend-express/.env:**
```bash
# Server
PORT=8000
NODE_ENV=production

# CORS - tambahkan IP VPS Anda
CORS_ORIGINS=http://localhost:3000,http://YOUR_VPS_IP:3000

# Gemini AI (REQUIRED)
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Pinata IPFS (OPTIONAL)
PINATA_JWT=your_actual_jwt_here
PINATA_GATEWAY=gateway.pinata.cloud

# Fabric
FABRIC_MSP_ID=UPPSMSP
FABRIC_WALLET_PATH=./wallet
FABRIC_CONNECTION_PROFILE=../fablo-target/fabric-config/connection-profiles/connection-profile-upps.json
```

**.env.production:**
```bash
VITE_API_URL=http://YOUR_VPS_IP:8000/api/v1
```

## 🚀 Langkah 4: Deploy!

### Deployment Otomatis (Recommended)
```bash
./deploy.sh start
```

Script ini akan:
1. ✅ Check prerequisites (Docker, Fablo, dll)
2. ✅ Start Hyperledger Fabric network
3. ✅ Build Docker images untuk backend & frontend
4. ✅ Start semua containers
5. ✅ Tampilkan status dan URL akses

### Deployment Manual

Jika ingin step-by-step manual:

#### 4.1 Start Fabric Network
```bash
fablo up
# Tunggu 5-10 menit untuk network siap
```

#### 4.2 Start Backend & Frontend
```bash
# Load environment
export $(cat .env.production | xargs)

# Build dan start
docker-compose -f docker-compose.production.yml up -d --build
```

## ✅ Langkah 5: Verifikasi

### 5.1 Check Status
```bash
./deploy.sh status
```

Atau manual:
```bash
# Check Fabric containers
docker ps | grep peer
docker ps | grep orderer

# Check application containers
docker-compose -f docker-compose.production.yml ps
```

### 5.2 Check Logs
```bash
# All logs
./deploy.sh logs

# Backend only
./deploy.sh logs backend

# Frontend only
./deploy.sh logs frontend
```

### 5.3 Test Endpoints
```bash
# Health check
curl http://YOUR_VPS_IP:8000/health

# API info
curl http://YOUR_VPS_IP:8000/api/v1

# Frontend (via browser)
# Buka: http://YOUR_VPS_IP:3000
```

## 🔄 Management Commands

```bash
# Show status
./deploy.sh status

# View logs
./deploy.sh logs
./deploy.sh logs backend
./deploy.sh logs frontend

# Restart services
./deploy.sh restart

# Stop everything
./deploy.sh stop

# Update code and rebuild
./deploy.sh update

# Fabric only
./deploy.sh fabric:start
./deploy.sh fabric:stop
```

## 📊 Monitoring

### Check Resource Usage
```bash
# Docker stats
docker stats

# Disk usage
docker system df

# Container logs
docker logs lamtek-backend
docker logs lamtek-frontend
```

### Check Fabric Network
```bash
# Peer logs
docker logs peer0.upps.akreditasi.local

# Orderer logs
docker logs orderer0.group1.orderer.akreditasi.local

# Chaincode logs
docker logs -f $(docker ps -q --filter name=dev-peer)
```

## 🛠️ Troubleshooting

### 1. Port Already in Use
```bash
# Find process
sudo lsof -i :8000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

### 2. Docker Permission Denied
```bash
sudo usermod -aG docker $USER
# Logout dan login kembali
```

### 3. Fabric Network Not Starting
```bash
# Clean up and restart
fablo down
fablo prune
rm -rf fablo-target
fablo up
```

### 4. Backend Cannot Connect to Fabric
```bash
# Check connection profile path
ls -la fablo-target/fabric-config/connection-profiles/

# Check if network is running
docker ps | grep peer
```

### 5. CORS Error di Frontend
```bash
# Update backend .env
nano backend-express/.env
# Pastikan CORS_ORIGINS include IP VPS

# Restart backend
docker-compose -f docker-compose.production.yml restart backend
```

### 6. Container Keeps Restarting
```bash
# Check logs
docker logs lamtek-backend
docker logs lamtek-frontend

# Check health
docker inspect lamtek-backend | grep -A 20 Health
```

## 🔄 Update Aplikasi

### Git Pull & Rebuild
```bash
cd ~/blockchain-new
./deploy.sh update
```

Atau manual:
```bash
git pull origin main
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

### Update Chaincode
```bash
cd chaincode/submission-contract
npm install
npm run build

# Upgrade chaincode via Fablo
cd ../..
fablo chaincode upgrade submission-contract
```

## 🧹 Cleanup

### Remove Unused Resources
```bash
# Remove unused containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Full cleanup
docker system prune -a --volumes -f
```

### Complete Reset
```bash
# WARNING: This will delete everything!
./deploy.sh stop
fablo prune
rm -rf fablo-target
docker system prune -a --volumes -f
```

## 🔒 Security Best Practices

### 1. Use HTTPS (Production)
Setup Nginx reverse proxy dengan Let's Encrypt:
```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 2. Environment Variables
- Jangan commit `.env` files ke git
- Gunakan secrets management untuk production
- Rotate API keys secara berkala

### 3. Firewall
- Hanya buka port yang diperlukan
- Gunakan fail2ban untuk SSH
- Monitor access logs

### 4. Backup
```bash
# Backup Fabric wallets
tar -czf wallet-backup.tar.gz backend-express/wallet

# Backup volumes
docker run --rm -v lamtek_backend-wallet:/data -v $(pwd):/backup ubuntu tar czf /backup/wallet-backup.tar.gz /data
```

## 📝 Quick Reference

### Access URLs
- **Frontend**: `http://YOUR_VPS_IP:3000`
- **Backend**: `http://YOUR_VPS_IP:8000`
- **API Docs**: `http://YOUR_VPS_IP:8000/api/v1`
- **Health Check**: `http://YOUR_VPS_IP:8000/health`

### Important Files
- `backend-express/.env` - Backend configuration
- `.env.production` - Frontend build configuration
- `docker-compose.production.yml` - Container orchestration
- `fablo-config.json` - Fabric network configuration
- `deploy.sh` - Deployment helper script

### Common Commands
```bash
# Full deployment
./deploy.sh start

# Check status
./deploy.sh status

# View logs
./deploy.sh logs

# Restart
./deploy.sh restart

# Stop
./deploy.sh stop
```

## 🆘 Support

Jika mengalami masalah:

1. Check logs: `./deploy.sh logs`
2. Check status: `./deploy.sh status`
3. Restart services: `./deploy.sh restart`
4. Check documentation di README.md

---

**Happy Deploying! 🚀**
