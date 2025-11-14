# Panduan Deployment ke VPS - Blockchain BATAP# Panduan Deployment ke VPS



## Quick Start Deployment## Daftar Isi

1. [Persiapan VPS](#persiapan-vps)

### 1. Persiapan VPS2. [Instalasi Dependencies](#instalasi-dependencies)

**Spesifikasi Minimum:**3. [Setup Project](#setup-project)

- CPU: 4 cores4. [Konfigurasi Environment](#konfigurasi-environment)

- RAM: 8GB (16GB recommended)5. [Deploy Blockchain Network](#deploy-blockchain-network)

- Storage: 50GB SSD6. [Deploy Backend](#deploy-backend)

- OS: Ubuntu 20.04/22.04 LTS7. [Deploy Frontend](#deploy-frontend)

8. [Setup Reverse Proxy (Nginx)](#setup-reverse-proxy-nginx)

### 2. Install Dependencies9. [Setup SSL Certificate](#setup-ssl-certificate)

10. [Monitoring dan Maintenance](#monitoring-dan-maintenance)

```bash11. [Troubleshooting](#troubleshooting)

# Update system

sudo apt update && sudo apt upgrade -y---



# Install Docker## Persiapan VPS

curl -fsSL https://get.docker.com -o get-docker.sh

sudo sh get-docker.sh### Spesifikasi Minimum VPS

sudo usermod -aG docker $USER- **CPU**: 4 cores

- **RAM**: 8GB (minimal), 16GB (recommended)

# Install Docker Compose- **Storage**: 50GB SSD

sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose- **OS**: Ubuntu 20.04/22.04 LTS

sudo chmod +x /usr/local/bin/docker-compose- **Network**: IP Publik & Port terbuka (80, 443, 7050-7054, 8050-8054)



# Install Node.js 18### 1. Login ke VPS

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -```bash

sudo apt-get install -y nodejsssh root@YOUR_VPS_IP

# atau

# Install Nginxssh username@YOUR_VPS_IP

sudo apt-get install -y nginx```

```

### 2. Update System

### 3. Clone & Setup Project```bash

sudo apt update && sudo apt upgrade -y

```bash```

mkdir -p ~/apps && cd ~/apps

git clone https://github.com/mvirgiawancr/blockchain-batap.git### 3. Buat User Non-Root (Opsional tapi Recommended)

cd blockchain-batap```bash

```# Buat user baru

sudo adduser deployer

### 4. Setup Backend Express

# Tambahkan ke sudo group

#### Environment Variablessudo usermod -aG sudo deployer

```bash

cd backend-express# Switch ke user baru

cp .env.example .envsu - deployer

nano .env```

```

---

**Isi .env:**

```env## Instalasi Dependencies

PORT=8000

NODE_ENV=production### 1. Install Docker

```bash

# Fabric (gunakan localhost jika pakai host network)# Hapus versi lama jika ada

FABRIC_CA_URL=http://localhost:7054sudo apt-get remove docker docker-engine docker.io containerd runc

FABRIC_PEER_URL=grpc://localhost:7051

FABRIC_ORDERER_URL=grpc://localhost:7050# Install dependencies

FABRIC_CHANNEL_NAME=akreditasisudo apt-get install -y \

FABRIC_CHAINCODE_NAME=submission-contract    apt-transport-https \

FABRIC_MSP_ID=sekretariatMSP    ca-certificates \

FABRIC_USER_ID=admin    curl \

FABRIC_WALLET_PATH=/app/wallet    gnupg \

    lsb-release

# API Keys (WAJIB DIISI!)

GEMINI_API_KEY=your_gemini_api_key_here# Tambahkan Docker GPG key

PINATA_JWT=your_pinata_jwt_herecurl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg



# CORS# Setup repository

CORS_ORIGINS=http://YOUR_VPS_IPecho \

```  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \

  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

#### Build & Run Backend

```bash# Install Docker Engine

# Build imagesudo apt-get update

docker build -t backend-express:latest .sudo apt-get install -y docker-ce docker-ce-cli containerd.io



# Cek network Fabric# Tambahkan user ke docker group

docker network ls | grep fablosudo usermod -aG docker $USER



# Run backend (sesuaikan network name)# Logout dan login kembali agar perubahan group berlaku

docker run -d \exit

  --name backend-express \# Login kembali

  --network fablo_network_XXXXXXXXXX_basic \```

  -p 8000:8000 \

  --env-file .env \### 2. Install Docker Compose

  -v /var/run/docker.sock:/var/run/docker.sock \```bash

  -v $(pwd)/logs:/app/logs \# Download Docker Compose

  -v $(pwd)/wallet:/app/wallet \sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

  --restart unless-stopped \

  backend-express:latest# Set permission

sudo chmod +x /usr/local/bin/docker-compose

# Cek logs

docker logs -f backend-express# Verifikasi instalasi

```docker-compose --version

```

### 5. Deploy Fabric Network

### 3. Install Node.js dan npm

```bash```bash

cd ../fablo-target/fabric-docker# Install Node.js 18.x

./fabric-docker.sh upcurl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

sudo apt-get install -y nodejs

# Verifikasi

docker ps | grep -E "peer|orderer|ca"# Verifikasi instalasi

```node --version

npm --version

### 6. Deploy Frontend```



#### Build Frontend### 4. Install Git

```bash```bash

cd ../../frontendsudo apt-get install -y git

nano .env.production

```# Konfigurasi Git

git config --global user.name "Your Name"

**Isi .env.production:**git config --global user.email "your.email@example.com"

```env```

# Ganti dengan IP VPS Anda

VITE_API_URL=http://YOUR_VPS_IP:8000/api/v1### 5. Install Nginx (untuk Reverse Proxy)

VITE_WS_URL=ws://YOUR_VPS_IP:8000/ws```bash

```sudo apt-get install -y nginx



```bash# Start Nginx

npm installsudo systemctl start nginx

npm run buildsudo systemctl enable nginx

``````



#### Setup Nginx### 6. Install Certbot (untuk SSL)

```bash```bash

# Copy buildsudo apt-get install -y certbot python3-certbot-nginx

sudo mkdir -p /var/www/blockchain-batap```

sudo cp -r dist/* /var/www/blockchain-batap/

sudo chown -R www-data:www-data /var/www/blockchain-batap---



# Config Nginx## Setup Project

sudo nano /etc/nginx/sites-available/blockchain-batap

```### 1. Clone Repository

```bash

**Nginx Config:**# Buat direktori untuk project

```nginxmkdir -p ~/apps

server {cd ~/apps

    listen 80 default_server;

    server_name YOUR_VPS_IP;# Clone repository

    git clone https://github.com/mvirgiawancr/blockchain-batap.git

    root /var/www/blockchain-batap;cd blockchain-batap

    index index.html;

    # Checkout branch yang sesuai

    location / {git checkout test-vps

        try_files $uri $uri/ /index.html;```

    }

    ### 2. Setup Permission

    location /api {```bash

        proxy_pass http://localhost:8000;# Pastikan script dapat dieksekusi

        proxy_http_version 1.1;chmod +x test_upload_with_scoring.sh

        proxy_set_header Upgrade $http_upgrade;chmod +x backend-express/test_api.sh

        proxy_set_header Connection 'upgrade';chmod +x fablo-target/fabric-docker.sh

        proxy_set_header Host $host;```

        proxy_set_header X-Real-IP $remote_addr;

    }---

    

    location /ws {## Konfigurasi Environment

        proxy_pass http://localhost:8000/ws;

        proxy_http_version 1.1;### 1. Backend Python - Environment Variables

        proxy_set_header Upgrade $http_upgrade;Buat file `.env` di folder `backend/`:

        proxy_set_header Connection "upgrade";```bash

        proxy_read_timeout 86400;cd ~/apps/blockchain-batap/backend

    }nano .env

}```

```

Isi dengan:

```bash```env

# Disable default & enable new site# Fabric Configuration

sudo rm /etc/nginx/sites-enabled/defaultFABRIC_CA_URL=http://localhost:7054

sudo ln -s /etc/nginx/sites-available/blockchain-batap /etc/nginx/sites-enabled/FABRIC_PEER_URL=grpc://localhost:7051

sudo nginx -tFABRIC_ORDERER_URL=grpc://localhost:7050

sudo systemctl restart nginxFABRIC_CHANNEL_NAME=akreditasi

```FABRIC_CHAINCODE_NAME=submission-contract

FABRIC_MSP_ID=UppsMSP

---FABRIC_USER_ID=admin



## Management Commands# Pinata Configuration

PINATA_API_KEY=your_pinata_api_key

### Restart BackendPINATA_SECRET_KEY=your_pinata_secret_key

```bashPINATA_JWT=your_pinata_jwt

docker restart backend-express

docker logs -f backend-express# Gemini AI Configuration

```GEMINI_API_KEY=your_gemini_api_key



### Restart Fabric# Application Configuration

```bashAPP_PORT=8000

cd ~/apps/blockchain-batap/fablo-target/fabric-dockerAPP_HOST=0.0.0.0

./fabric-docker.sh restartDEBUG=False

```

# CORS Configuration

### Update FrontendALLOWED_ORIGINS=http://your-domain.com,https://your-domain.com

```bash```

cd ~/apps/blockchain-batap/frontend

npm run build### 2. Backend Express - Environment Variables

sudo cp -r dist/* /var/www/blockchain-batap/Buat file `.env` di folder `backend-express/`:

sudo systemctl reload nginx```bash

```cd ~/apps/blockchain-batap/backend-express

nano .env

### Stop All Services```

```bash

# Stop NginxIsi dengan:

sudo systemctl stop nginx```env

# Server Configuration

# Stop BackendNODE_ENV=production

docker stop backend-expressPORT=8000

HOST=0.0.0.0

# Stop Fabric

cd ~/apps/blockchain-batap/fablo-target/fabric-docker# Fabric Configuration

./fabric-docker.sh downFABRIC_CA_URL=http://localhost:7054

```FABRIC_PEER_URL=grpc://localhost:7051

FABRIC_ORDERER_URL=grpc://localhost:7050

---FABRIC_CHANNEL_NAME=akreditasi

FABRIC_CHAINCODE_NAME=submission-contract

## Troubleshooting Quick FixesFABRIC_MSP_ID=UppsMSP

FABRIC_USER_ID=admin

### Backend tidak bisa connect ke Fabric

```bash# Pinata Configuration

# Gunakan host networkPINATA_API_KEY=your_pinata_api_key

docker stop backend-express && docker rm backend-expressPINATA_SECRET_KEY=your_pinata_secret_key

docker run -d --name backend-express --network host --env-file .env \PINATA_JWT=your_pinata_jwt

  -v /var/run/docker.sock:/var/run/docker.sock \

  -v $(pwd)/logs:/app/logs -v $(pwd)/wallet:/app/wallet \# Gemini AI Configuration

  --restart unless-stopped backend-express:latestGEMINI_API_KEY=your_gemini_api_key

```

# Upload Configuration

### Blockchain storage failed - Docker not foundMAX_FILE_SIZE=104857600

```bashALLOWED_EXTENSIONS=.pdf,.doc,.docx,.xls,.xlsx

# Mount Docker socket

docker run -d --name backend-express \# CORS Configuration

  -v /var/run/docker.sock:/var/run/docker.sock \ALLOWED_ORIGINS=http://your-domain.com,https://your-domain.com

  ... # (other params)```

```

### 3. Frontend - Environment Variables

### Gemini API 503 Overloaded

- Backend sudah ada auto-retry 3x dengan exponential backoff#### Opsi A: Deploy dengan IP (Tanpa Domain) 🎯

- Tunggu 10-30 detik, upload ulang

- Atau ganti model di .env: `GEMINI_MODEL=gemini-1.5-flash`Buat file `.env.production` di folder `frontend/`:

```bash

---cd ~/apps/blockchain-batap/frontend

nano .env.production

## Monitoring```



```bash**Isi dengan IP VPS Anda:**

# Cek semua container```env

docker ps -a# Ganti YOUR_VPS_IP dengan IP public VPS Anda

# Contoh: 103.123.45.67

# Cek logs backend

docker logs -f backend-express# Backend Express berjalan di port 8000

VITE_API_URL=http://YOUR_VPS_IP:8000/api/v1

# Cek Fabric networkVITE_WS_URL=ws://YOUR_VPS_IP:8000/ws

docker ps | grep -E "peer|orderer|ca"

# Contoh nyata (misal IP VPS: 103.123.45.67):

# Cek Nginx status# VITE_API_URL=http://103.123.45.67:8000/api/v1

sudo systemctl status nginx# VITE_WS_URL=ws://103.123.45.67:8000/ws

sudo tail -f /var/log/nginx/error.log```

```

**Jika pakai Nginx reverse proxy (tidak expose port 8000):**

---```env

# Nginx akan proxy request ke backend

## Deployment ChecklistVITE_API_URL=http://YOUR_VPS_IP/api/v1

VITE_WS_URL=ws://YOUR_VPS_IP/ws

- [ ] VPS ready & dependencies installed```

- [ ] Repository cloned

- [ ] Backend .env configured (API keys!)**Update CORS di Backend:**

- [ ] Fabric network running```bash

- [ ] Backend container running# Edit backend-express/.env

- [ ] Frontend built & deployedcd ~/apps/blockchain-batap/backend-express

- [ ] Nginx configurednano .env

- [ ] Test upload file dari browser```

- [ ] Check blockchain storage berhasil

Tambahkan IP VPS ke ALLOWED_ORIGINS:

**Akses:** `http://YOUR_VPS_IP````env

# Ganti dengan IP VPS Anda

---ALLOWED_ORIGINS=http://YOUR_VPS_IP,http://YOUR_VPS_IP:5173,http://localhost:5173



Untuk troubleshooting detail, lihat file TROUBLESHOOTING_*.md# Pastikan PORT di set ke 8000

PORT=8000
```

#### Opsi B: Deploy dengan Domain (Jika Sudah Punya)

Buat file `.env.production` di folder `frontend/`:
```bash
cd ~/apps/blockchain-batap/frontend
nano .env.production
```

**Isi dengan domain Anda:**
```env
# Dengan domain dan SSL
VITE_API_URL=https://api.your-domain.com/api/v1
VITE_WS_URL=wss://api.your-domain.com/ws

# Atau tanpa subdomain
VITE_API_URL=https://your-domain.com/api/v1
VITE_WS_URL=wss://your-domain.com/ws
```

**Update CORS di Backend:**
```bash
cd ~/apps/blockchain-batap/backend-express
nano .env
```

```env
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

---

## Deploy Blockchain Network

### 1. Generate Fabric Network dengan Fablo
```bash
cd ~/apps/blockchain-batap

# Jika menggunakan fablo CLI (perlu install dulu)
# curl -Lf https://github.com/hyperledger-labs/fablo/releases/download/1.1.0/fablo.sh -o fablo && chmod +x fablo
# ./fablo generate ./fablo-config.json

# Atau langsung gunakan yang sudah di-generate
cd fablo-target/fabric-docker
```

### 2. Start Fabric Network
```bash
cd ~/apps/blockchain-batap/fablo-target/fabric-docker

# Start network
./fabric-docker.sh up

# Tunggu sampai semua container running
docker ps
```

### 3. Install Chaincode
```bash
# Masuk ke container CLI
docker exec -it cli.upps.batap.ac.id bash

# Di dalam container, install chaincode
peer lifecycle chaincode package submission-contract.tar.gz \
  --path /opt/gopath/src/github.com/chaincode/submission-contract \
  --lang node \
  --label submission-contract_1.0

# Install ke peer
peer lifecycle chaincode install submission-contract.tar.gz

# Approve chaincode
peer lifecycle chaincode approveformyorg \
  --channelID akreditasi \
  --name submission-contract \
  --version 1.0 \
  --package-id <PACKAGE_ID> \
  --sequence 1 \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/orderer.batap.ac.id/orderers/orderer0.orderer.batap.ac.id/msp/tlscacerts/tlsca.orderer.batap.ac.id-cert.pem

# Commit chaincode
peer lifecycle chaincode commit \
  --channelID akreditasi \
  --name submission-contract \
  --version 1.0 \
  --sequence 1 \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/orderer.batap.ac.id/orderers/orderer0.orderer.batap.ac.id/msp/tlscacerts/tlsca.orderer.batap.ac.id-cert.pem

# Exit dari container
exit
```

### 4. Verifikasi Network
```bash
# Cek semua container running
docker ps

# Expected containers:
# - orderer
# - peer0.upps
# - peer0.sekretariat
# - ca.upps
# - ca.sekretariat
# - cli
```

---

## Deploy Backend Express

Untuk deployment backend Express, ada **3 opsi** yang bisa dipilih:

### Opsi 1: Deploy dengan Docker (RECOMMENDED) ⭐

#### 1. Setup Environment Variables
```bash
cd ~/apps/blockchain-batap/backend-express

# Copy example env
cp .env.example .env

# Edit sesuai konfigurasi VPS Anda
nano .env
```

**Isi `.env` dengan konfigurasi berikut:**
```env
# Server Configuration
NODE_ENV=production
PORT=8000
HOST=0.0.0.0

# Fabric Configuration (sesuaikan dengan network Anda)
FABRIC_CA_URL=http://ca.upps.batap.ac.id:7054
FABRIC_PEER_URL=grpc://peer0.upps.batap.ac.id:7051
FABRIC_ORDERER_URL=grpc://orderer0.orderer.batap.ac.id:7050
FABRIC_CHANNEL_NAME=akreditasi
FABRIC_CHAINCODE_NAME=submission-contract
FABRIC_MSP_ID=UppsMSP
FABRIC_USER_ID=admin
FABRIC_ORG_NAME=Upps
FABRIC_WALLET_PATH=/app/wallet

# Pinata Configuration (untuk IPFS storage)
PINATA_API_KEY=ganti_dengan_api_key_anda
PINATA_SECRET_KEY=ganti_dengan_secret_key_anda
PINATA_JWT=ganti_dengan_jwt_token_anda

# Gemini AI Configuration (untuk scoring otomatis)
GEMINI_API_KEY=ganti_dengan_gemini_api_key_anda

# Upload Configuration
MAX_FILE_SIZE=104857600
ALLOWED_EXTENSIONS=.pdf,.doc,.docx,.xls,.xlsx

# CORS Configuration (sesuaikan dengan domain Anda)
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

#### 2. Build Docker Image
```bash
cd ~/apps/blockchain-batap/backend-express

# Build image
docker build -t backend-express:latest .

# Verifikasi image berhasil dibuat
docker images | grep backend-express
```

#### 3. Jalankan Container

**PENTING:** Cek nama network Fabric terlebih dahulu:
```bash
# Lihat semua network yang ada
docker network ls

# Cari network yang namanya mengandung "fablo_network"
# Contoh: fablo_network_202511111204_basic
```

**Jalankan container (SESUAIKAN NAMA NETWORK):**
```bash
# Ganti <FABRIC_NETWORK_NAME> dengan nama network yang sesuai
# Contoh: fablo_network_202511111204_basic

docker run -d \
  --name backend-express \
  --network <FABRIC_NETWORK_NAME> \
  -p 8000:8000 \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/wallet:/app/wallet \
  -v ../fablo-target/fabric-config:/fabric-config:ro \
  --restart unless-stopped \
  backend-express:latest

# Contoh nyata (sesuaikan dengan network Anda):
# docker run -d \
#   --name backend-express \
#   --network fablo_network_202511111204_basic \
#   -p 8000:8000 \
#   --env-file .env \
#   -v $(pwd)/logs:/app/logs \
#   -v $(pwd)/wallet:/app/wallet \
#   -v ../fablo-target/fabric-config:/fabric-config:ro \
#   --restart unless-stopped \
#   backend-express:latest
```

**ALTERNATIF:** Jika tidak ingin pakai Docker network (lebih mudah untuk testing):
```bash
# Jalankan tanpa network, expose semua ports yang diperlukan
docker run -d \
  --name backend-express \
  -p 8000:8000 \
  --env-file .env \
  --add-host=host.docker.internal:host-gateway \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/wallet:/app/wallet \
  -v ../fablo-target/fabric-config:/fabric-config:ro \
  --restart unless-stopped \
  backend-express:latest

# Update .env untuk pakai localhost:
# FABRIC_CA_URL=http://localhost:7054
# FABRIC_PEER_URL=grpc://localhost:7051
# FABRIC_ORDERER_URL=grpc://localhost:7050
```

**Cek container berjalan:**
```bash
# Cek container running
docker ps | grep backend-express

# Cek logs
docker logs -f backend-express
```

#### 4. Verifikasi Backend Berjalan
```bash
# Test health check
curl http://localhost:8000/health

# Expected response:
# {"status":"OK","timestamp":"...","service":"LAM-TEK 2025 Backend",...}

# Test API endpoint
curl http://localhost:8000/api/v1
```

---

### Opsi 2: Deploy dengan Docker Compose

#### 1. Buat File docker-compose.backend.yml

**PENTING:** Cek nama network Fabric dulu dengan `docker network ls`

```bash
cd ~/apps/blockchain-batap
nano docker-compose.backend.yml
```

**Isi dengan (SESUAIKAN nama network di bagian bawah):**
```yaml
version: '3.8'

services:
  backend-express:
    build:
      context: ./backend-express
      dockerfile: Dockerfile
    container_name: backend-express
    restart: unless-stopped
    ports:
      - "8000:8000"
    env_file:
      - ./backend-express/.env
    volumes:
      - ./backend-express/logs:/app/logs
      - ./backend-express/wallet:/app/wallet
      - ./fablo-target/fabric-config:/fabric-config:ro
    networks:
      - fabric-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  fabric-network:
    external: true
    # ⚠️ GANTI dengan nama network Fabric Anda!
    # Lihat dengan: docker network ls | grep fablo
    # Contoh: fablo_network_202511111204_basic
    name: fablo_network_202511111204_basic
```

**ALTERNATIF (tanpa network external):**
```yaml
version: '3.8'

services:
  backend-express:
    build:
      context: ./backend-express
      dockerfile: Dockerfile
    container_name: backend-express
    restart: unless-stopped
    network_mode: "host"  # Gunakan host network
    env_file:
      - ./backend-express/.env
    volumes:
      - ./backend-express/logs:/app/logs
      - ./backend-express/wallet:/app/wallet
      - ./fablo-target/fabric-config:/fabric-config:ro
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### 2. Jalankan dengan Docker Compose
```bash
# Start service
docker-compose -f docker-compose.backend.yml up -d

# Cek logs
docker-compose -f docker-compose.backend.yml logs -f backend-express

# Stop service
docker-compose -f docker-compose.backend.yml down

# Restart service
docker-compose -f docker-compose.backend.yml restart backend-express
```

---

### Opsi 3: Deploy Manual dengan PM2 (tanpa Docker)

#### 1. Install Node.js Dependencies
```bash
cd ~/apps/blockchain-batap/backend-express

# Install dependencies
npm install --production

# Atau untuk development
npm install
```

#### 2. Setup Environment Variables
```bash
# Copy dan edit .env
cp .env.example .env
nano .env

# Pastikan FABRIC_WALLET_PATH mengarah ke path yang benar
# Misal: FABRIC_WALLET_PATH=/home/deployer/apps/blockchain-batap/backend-express/wallet
```

#### 3. Install PM2
```bash
# Install PM2 globally
sudo npm install -g pm2
```

#### 4. Buat File PM2 Ecosystem
```bash
nano ecosystem.config.js
```

Isi dengan:
```javascript
module.exports = {
  apps: [{
    name: 'backend-express',
    script: './src/server.js',
    instances: 2, // atau 'max' untuk gunakan semua CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
```

#### 5. Start dengan PM2
```bash
# Start menggunakan ecosystem file
pm2 start ecosystem.config.js

# Atau start langsung
pm2 start src/server.js --name backend-express -i 2

# Simpan konfigurasi PM2
pm2 save

# Setup PM2 startup script (agar auto-start saat reboot)
pm2 startup
# Copy dan jalankan command yang muncul (biasanya: sudo env PATH=...)

# Monitoring
pm2 monit

# Melihat logs
pm2 logs backend-express

# Restart aplikasi
pm2 restart backend-express

# Stop aplikasi
pm2 stop backend-express

# Delete dari PM2
pm2 delete backend-express
```

#### 6. PM2 Commands Berguna
```bash
# List semua aplikasi
pm2 list

# Informasi detail
pm2 show backend-express

# Monitoring real-time
pm2 monit

# Logs
pm2 logs backend-express --lines 100

# Flush logs
pm2 flush

# Reload (zero-downtime restart)
pm2 reload backend-express

# Update PM2
pm2 update
```

---

## Testing Backend Express

### 1. Test Health Check
```bash
curl http://localhost:8000/health
```

### 2. Test API Endpoints
```bash
# Get API info
curl http://localhost:8000/api/v1

# Test upload endpoint (perlu authentication)
curl -X POST http://localhost:8000/api/v1/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-file.pdf"

# Test submissions endpoint
curl http://localhost:8000/api/v1/submissions

# Test scoring endpoint
curl http://localhost:8000/api/v1/scoring
```

### 3. Test WebSocket Connection
```bash
# Install wscat untuk testing WebSocket
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:8000/ws

# Kirim message
> {"type":"ping"}

# Expected response
< {"type":"pong"}
```

### 4. Load Testing (Opsional)
```bash
# Install autocannon
npm install -g autocannon

# Run load test
autocannon -c 100 -d 30 http://localhost:8000/health
```

---

## Troubleshooting Backend Express

### 1. Container Tidak Bisa Start
```bash
# Cek logs container
docker logs backend-express

# Cek konfigurasi network
docker network ls
docker network inspect fabric-docker_default

# Rebuild image
docker-compose -f docker-compose.backend.yml build --no-cache backend-express
```

### 2. Cannot Connect to Fabric Network
```bash
# Pastikan Fabric network sudah running
docker ps | grep peer
docker ps | grep orderer
docker ps | grep ca

# Test koneksi ke CA
curl http://ca.upps.batap.ac.id:7054/cainfo

# Cek environment variables
docker exec backend-express env | grep FABRIC
```

### 3. Port 3000 Already in Use
```bash
# Cek proses yang menggunakan port 8000
sudo lsof -i :8000

# Kill proses
sudo kill -9 PID

# Atau gunakan port lain
# Edit .env: PORT=3001
```

### 4. PM2 Issues
```bash
# Reset PM2
pm2 kill
pm2 start ecosystem.config.js

# Clear logs
pm2 flush

# Reinstall PM2
npm uninstall -g pm2
npm install -g pm2
```

### 5. Memory Issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 src/server.js

# Atau di PM2 ecosystem.config.js:
# node_args: '--max-old-space-size=4096'
```

### 6. File Permission Issues
```bash
# Fix permissions
sudo chown -R $USER:$USER ~/apps/blockchain-batap/backend-express
chmod -R 755 ~/apps/blockchain-batap/backend-express
chmod 644 ~/apps/blockchain-batap/backend-express/.env
```

---

## Monitoring Backend Express

### 1. PM2 Monitoring (jika pakai PM2)
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# Enable web monitoring
pm2 web
# Akses di: http://YOUR_VPS_IP:9615
```

### 2. Docker Stats
```bash
# Monitor resource usage
docker stats backend-express

# Continuous monitoring
watch -n 1 'docker stats --no-stream backend-express'
```

### 3. Application Logs
```bash
# Tail logs
tail -f ~/apps/blockchain-batap/backend-express/logs/app.log

# Dengan PM2
pm2 logs backend-express --lines 100

# Dengan Docker
docker logs -f --tail 100 backend-express
```

---

## Update Backend Express

### Menggunakan Docker
```bash
cd ~/apps/blockchain-batap

# Pull latest code
git pull origin test-vps

# Rebuild dan restart
docker-compose -f docker-compose.backend.yml up -d --build backend-express

# Atau dengan docker command
docker stop backend-express
docker rm backend-express
cd backend-express
docker build -t backend-express:latest .
docker run -d --name backend-express ... # (command seperti sebelumnya)
```

### Menggunakan PM2
```bash
cd ~/apps/blockchain-batap

# Pull latest code
git pull origin test-vps

# Install dependencies baru (jika ada)
cd backend-express
npm install

# Reload aplikasi (zero-downtime)
pm2 reload backend-express

# Atau restart
pm2 restart backend-express
```

---

## Deploy Frontend

### 1. Setup Environment Variables

**Untuk deployment dengan IP (tanpa domain):**
```bash
cd ~/apps/blockchain-batap/frontend

# Buat file .env.production
nano .env.production
```

**Isi dengan IP VPS Anda:**
```env
# Ganti 103.123.45.67 dengan IP VPS Anda yang sebenarnya
VITE_API_URL=http://103.123.45.67:8000/api/v1
VITE_WS_URL=ws://103.123.45.67:8000/ws
```

### 2. Build Frontend
```bash
cd ~/apps/blockchain-batap/frontend

# Install dependencies
npm install

# Build untuk production (akan otomatis pakai .env.production)
npm run build

# Hasil build ada di folder dist/
```

### 3. Verifikasi Build
```bash
# Cek isi file yang di-build sudah pakai IP yang benar
grep -r "103.123.45.67" dist/assets/*.js

# Atau cek dengan:
cat dist/assets/*.js | grep VITE_API_URL
```

### 4. Deploy Frontend dengan Nginx
```bash
# Copy build ke nginx directory
sudo mkdir -p /var/www/blockchain-batap
sudo cp -r dist/* /var/www/blockchain-batap/

# Set permission
sudo chown -R www-data:www-data /var/www/blockchain-batap
sudo chmod -R 755 /var/www/blockchain-batap
```

### 5. Quick Update Frontend
```bash
# Jika ada perubahan, update dengan cepat:
cd ~/apps/blockchain-batap/frontend
npm run build
sudo cp -r dist/* /var/www/blockchain-batap/
sudo systemctl reload nginx
```

---

## Setup Reverse Proxy (Nginx)

### 1. Konfigurasi Nginx

Ada 2 opsi konfigurasi tergantung apakah Anda punya domain atau tidak:

#### Opsi A: Konfigurasi dengan IP (Tanpa Domain) 🎯

```bash
sudo nano /etc/nginx/sites-available/blockchain-batap
```

**Konfigurasi untuk akses via IP:**
```nginx
# Frontend + Backend API dalam satu IP
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    # Ganti dengan IP VPS Anda
    server_name YOUR_VPS_IP;

    # Frontend - serve static files
    root /var/www/blockchain-batap;
    index index.html;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy ke Backend Express
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (jika diperlukan)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept, Authorization' always;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}

# Optional: Expose Backend langsung di port 8000 (untuk testing)
# Uncomment jika ingin akses langsung ke backend di http://IP:8000
# server {
#     listen 3000;
#     server_name YOUR_VPS_IP;
#
#     location / {
#         proxy_pass http://localhost:8000;
#         proxy_http_version 1.1;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#     }
# }
```

**Update Frontend Environment untuk pakai Nginx proxy:**
```bash
# Edit .env.production
nano ~/apps/blockchain-batap/frontend/.env.production
```

```env
# Karena Nginx akan proxy /api ke backend
# Ganti dengan IP VPS Anda
VITE_API_URL=http://YOUR_VPS_IP/api/v1
VITE_WS_URL=ws://YOUR_VPS_IP/ws
```

**Rebuild frontend setelah update env:**
```bash
cd ~/apps/blockchain-batap/frontend
npm run build
sudo cp -r dist/* /var/www/blockchain-batap/
```

#### Opsi B: Konfigurasi dengan Domain (Jika Sudah Punya)

```bash
sudo nano /etc/nginx/sites-available/blockchain-batap
```

**Konfigurasi untuk domain:**
```nginx
# Frontend
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/blockchain-batap;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}

# Backend API
server {
    listen 80;
    server_name api.your-domain.com;

    # Backend Express
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

### 2. Enable Site dan Restart Nginx
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/blockchain-batap /etc/nginx/sites-enabled/

# Test konfigurasi
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Setup SSL Certificate

### 1. Pastikan Domain Sudah Pointing ke VPS
Sebelum setup SSL, pastikan DNS domain sudah pointing ke IP VPS Anda:
- A Record: `your-domain.com` → `YOUR_VPS_IP`
- A Record: `www.your-domain.com` → `YOUR_VPS_IP`
- A Record: `api.your-domain.com` → `YOUR_VPS_IP`

### 2. Generate SSL Certificate dengan Let's Encrypt
```bash
# Generate certificate untuk semua domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com -d api.your-domain.com

# Ikuti instruksi interaktif
# Pilih untuk redirect HTTP ke HTTPS (recommended)
```

### 3. Auto-renewal Certificate
```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot akan otomatis setup cron job untuk renewal
# Verifikasi dengan:
sudo systemctl status certbot.timer
```

---

## Monitoring dan Maintenance

### 1. Monitoring Services

#### Check Docker Containers
```bash
# List semua containers
docker ps -a

# Check logs
docker logs <container_name>
docker logs -f <container_name>  # follow logs
```

#### Check PM2 Processes (jika deploy manual)
```bash
# List processes
pm2 list

# Monitor
pm2 monit

# Check logs
pm2 logs backend-python
pm2 logs backend-express
```

#### Check Nginx
```bash
# Status
sudo systemctl status nginx

# Logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Setup Monitoring Tools (Opsional)

#### Install Portainer (untuk Docker management)
```bash
docker volume create portainer_data

docker run -d \
  -p 9000:9000 \
  --name portainer \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```
Akses di: `http://YOUR_VPS_IP:9000`

### 3. Backup Strategy

#### Script Backup
```bash
# Buat script backup
nano ~/backup.sh
```

Isi dengan:
```bash
#!/bin/bash

BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/home/$USER/apps/blockchain-batap"

# Buat direktori backup
mkdir -p $BACKUP_DIR

# Backup fabric data
docker run --rm \
  -v fabric-docker_data:/data \
  -v $BACKUP_DIR:/backup \
  ubuntu tar czf /backup/fabric-data-$DATE.tar.gz /data

# Backup project
tar czf $BACKUP_DIR/project-$DATE.tar.gz $PROJECT_DIR

# Hapus backup lama (simpan 7 hari terakhir)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Set permission
chmod +x ~/backup.sh

# Setup cron untuk backup otomatis (setiap hari jam 2 pagi)
crontab -e
# Tambahkan:
0 2 * * * /home/$USER/backup.sh >> /home/$USER/backup.log 2>&1
```

### 4. Update Aplikasi
```bash
cd ~/apps/blockchain-batap

# Pull latest changes
git pull origin test-vps

# Update backend
cd backend
docker-compose -f ../docker-compose.backend.yml up -d --build backend-python

# Update frontend
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/blockchain-batap/

# Restart services
sudo systemctl restart nginx
```

---

## Troubleshooting

### 1. Port Already in Use
```bash
# Check port usage
sudo lsof -i :PORT_NUMBER

# Kill process
sudo kill -9 PID
```

### 2. Docker Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout dan login kembali
```

### 3. Fabric Network Issues
```bash
# Stop network
cd ~/apps/blockchain-batap/fablo-target/fabric-docker
./fabric-docker.sh down

# Clean up
./fabric-docker.sh prune

# Start again
./fabric-docker.sh up
```

### 4. Nginx 502 Bad Gateway
```bash
# Check backend is running
pm2 list
# atau
docker ps

# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Check firewall
sudo ufw status
sudo ufw allow 3000
sudo ufw allow 8000
```

### 5. SSL Certificate Issues
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### 6. Out of Memory
```bash
# Check memory usage
free -h

# Add swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 7. Check Logs
```bash
# Docker logs
docker logs <container_name>

# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -xe
```

---

## Security Best Practices

### 1. Firewall Setup
```bash
# Install UFW
sudo apt-get install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Fabric ports (jika perlu akses dari luar)
sudo ufw allow 7050:7054/tcp
sudo ufw allow 8050:8054/tcp

# Enable firewall
sudo ufw enable
```

### 2. SSH Hardening
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Ubah/tambahkan:
# Port 2222  # Ganti port default
# PermitRootLogin no
# PasswordAuthentication no  # Gunakan SSH key
# PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart sshd
```

### 3. Fail2Ban (Protection against brute force)
```bash
# Install
sudo apt-get install -y fail2ban

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Start service
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 4. Regular Updates
```bash
# Setup unattended upgrades
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Checklist Deployment

- [ ] VPS sudah ready dengan spesifikasi minimum
- [ ] Domain sudah pointing ke IP VPS
- [ ] Docker dan Docker Compose terinstall
- [ ] Node.js dan npm terinstall
- [ ] Repository sudah di-clone
- [ ] Environment variables sudah dikonfigurasi
- [ ] Fabric network sudah running
- [ ] Chaincode sudah terinstall
- [ ] Backend services running
- [ ] Frontend sudah di-build dan deploy
- [ ] Nginx sudah dikonfigurasi
- [ ] SSL certificate sudah terinstall
- [ ] Firewall sudah dikonfigurasi
- [ ] Backup strategy sudah di-setup
- [ ] Monitoring tools sudah di-setup
- [ ] Testing semua endpoint API
- [ ] Testing frontend dapat akses backend
- [ ] WebSocket connection berfungsi

---

## Kontak dan Support

Jika ada masalah atau pertanyaan:
1. Check dokumentasi di folder `docs/`
2. Review logs untuk error messages
3. Check GitHub issues di repository

---

**Selamat! Project Anda sudah berhasil di-deploy ke VPS!** 🎉
