# 🚀 Panduan Deployment ke VPS

Panduan ini menjelaskan langkah-langkah deployment project Blockchain Akreditasi ke VPS untuk testing.

## 📋 Prasyarat

1. **VPS Requirements:**
   - Ubuntu 20.04 atau lebih baru
   - RAM minimal 8GB (recommended 16GB untuk Hyperledger Fabric)
   - Storage minimal 50GB
   - Docker & Docker Compose terinstall
   - Port yang akan digunakan terbuka di firewall

2. **Port yang Digunakan:**
   - **Frontend**: 3000
   - **Backend**: 8000
   - **Hyperledger Fabric**: berbagai port (7050, 7051, 9051, dll)
   - **CouchDB**: 5984, 6984
   - **Fabric Explorer**: 7070 (jika diaktifkan)

## 🔧 Langkah 1: Persiapan VPS

### 1.1 Login ke VPS
```bash
ssh user@IP_VPS
```

### 1.2 Install Docker & Docker Compose
```bash
# Update package list
sudo apt update
sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

**PENTING:** Logout dan login kembali setelah menambahkan user ke docker group

### 1.3 Install Node.js & npm (untuk Fablo)
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 1.4 Install Fablo (untuk Hyperledger Fabric)
```bash
sudo curl -Lf https://github.com/hyperledger-labs/fablo/releases/download/2.3.0/fablo.sh -o /usr/local/bin/fablo
sudo chmod +x /usr/local/bin/fablo
```

### 1.5 Buka Port di Firewall
```bash
# UFW (Ubuntu Firewall)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 8000/tcp  # Backend
sudo ufw allow 7070/tcp  # Fabric Explorer (optional)
sudo ufw enable

# Atau jika menggunakan firewalld
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=7070/tcp
sudo firewall-cmd --reload
```

## 📦 Langkah 2: Upload Project ke VPS

### Option A: Menggunakan Git (Recommended)
```bash
# Di VPS
cd ~
git clone https://github.com/mvirgiawancr/blockchain-batap.git
cd blockchain-batap
```

### Option B: Menggunakan SCP/SFTP
```bash
# Di komputer lokal
# Compress project (exclude node_modules dan artifacts)
tar --exclude='node_modules' \
    --exclude='fablo-target' \
    --exclude='__pycache__' \
    --exclude='.git' \
    -czf blockchain-project.tar.gz /home/virgi/blockchain-new

# Upload ke VPS
scp blockchain-project.tar.gz user@IP_VPS:~/

# Di VPS
cd ~
tar -xzf blockchain-project.tar.gz
cd blockchain-new
```

## 🔐 Langkah 3: Konfigurasi Environment Variables

### 3.1 Setup Backend Environment
```bash
cd ~/blockchain-new/backend
cat > .env << 'EOF'
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_KEY=your_pinata_secret_key_here
PINATA_JWT=your_pinata_jwt_here

# Fabric Configuration
FABRIC_NETWORK_PATH=/fablo-target
FABRIC_CHANNEL_NAME=akreditasi
FABRIC_CHAINCODE_NAME=submission-contract
FABRIC_ORG_NAME=UPPS
FABRIC_PEER_NAME=peer0

# CORS Configuration
CORS_ORIGINS=http://IP_VPS:3000,http://localhost:3000

# WebSocket Configuration
WS_ORIGINS=http://IP_VPS:3000,http://localhost:3000
EOF

# Edit file .env dan ganti IP_VPS dengan IP server Anda
nano .env
```

### 3.2 Setup Frontend Environment
Frontend akan dikonfigurasi lewat docker-compose nanti.

## 🏗️ Langkah 4: Setup Hyperledger Fabric Network

### 4.1 Generate Fabric Network
```bash
cd ~/blockchain-new

# Generate network configuration
fablo generate

# Start Fabric network
fablo up
```

**Catatan:** Proses ini memakan waktu 5-10 menit pertama kali dijalankan.

### 4.2 Verifikasi Fabric Network
```bash
# Check running containers
docker ps

# Test chaincode
docker exec cli.upps.akreditasi.local peer chaincode query \
  -C akreditasi \
  -n submission-contract \
  -c '{"function":"GetAllSubmissions","Args":[]}'
```

## 🐳 Langkah 5: Setup Backend dan Frontend

### 5.1 Update docker-compose untuk Production
Saya sudah menyediakan file `docker-compose.production.yml` yang sudah dikonfigurasi.

```bash
cd ~/blockchain-new

# Build dan start services
docker-compose -f docker-compose.production.yml up -d --build
```

### 5.2 Monitoring Logs
```bash
# View all logs
docker-compose -f docker-compose.production.yml logs -f

# View specific service logs
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
```

## ✅ Langkah 6: Verifikasi Deployment

### 6.1 Check Services
```bash
# Check all containers
docker ps

# Check backend health
curl http://IP_VPS:8000

# Check frontend (dari browser)
# Buka: http://IP_VPS:3000
```

### 6.2 Test API
```bash
# Test backend API
curl http://IP_VPS:8000/api/health
curl http://IP_VPS:8000/api/submissions
```

## 🔄 Langkah 7: Restart dan Update

### Restart Services
```bash
cd ~/blockchain-new

# Restart all services
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart backend
```

### Update Code (Jika pakai Git)
```bash
cd ~/blockchain-new

# Pull latest code
git pull origin main

# Rebuild dan restart
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build
```

## 🛑 Langkah 8: Stop Services

### Stop All Services
```bash
cd ~/blockchain-new

# Stop backend & frontend
docker-compose -f docker-compose.production.yml down

# Stop Fabric network
fablo down
```

### Stop and Clean Everything
```bash
# WARNING: This will remove all data!
docker-compose -f docker-compose.production.yml down -v
fablo prune
```

## 📊 Monitoring dan Troubleshooting

### Check Disk Usage
```bash
docker system df
docker volume ls
```

### Clean Up Docker
```bash
# Remove unused containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f
```

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :8000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

#### 2. Permission Denied for Docker
```bash
sudo usermod -aG docker $USER
# Logout dan login kembali
```

#### 3. Container Keeps Restarting
```bash
# Check logs
docker logs <container_name>
docker-compose -f docker-compose.production.yml logs backend
```

#### 4. Network Issues
```bash
# Check networks
docker network ls

# Recreate networks
docker-compose -f docker-compose.production.yml down
fablo down
fablo up
docker-compose -f docker-compose.production.yml up -d
```

## 🔒 Security Best Practices (Production)

1. **Gunakan HTTPS dengan Nginx Reverse Proxy**
2. **Setup Firewall yang proper**
3. **Gunakan environment variables untuk secrets**
4. **Regular backup database dan volumes**
5. **Monitor logs dan resource usage**
6. **Update sistem secara berkala**

## 📝 Quick Reference Commands

```bash
# Start everything
cd ~/blockchain-new
fablo up  # Start Fabric first
docker-compose -f docker-compose.production.yml up -d

# Stop everything
docker-compose -f docker-compose.production.yml down
fablo down

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Restart backend only
docker-compose -f docker-compose.production.yml restart backend

# Check status
docker ps
docker-compose -f docker-compose.production.yml ps
```

## 🌐 Access URLs

Setelah deployment berhasil, aplikasi bisa diakses di:
- **Frontend**: http://IP_VPS:3000
- **Backend API**: http://IP_VPS:8000
- **API Docs**: http://IP_VPS:8000/docs
- **Fabric Explorer**: http://IP_VPS:7070 (jika enabled)

---

**Good luck! 🚀**
