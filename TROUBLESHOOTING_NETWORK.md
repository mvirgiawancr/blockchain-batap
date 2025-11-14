# Troubleshooting: Docker Network Issues# Troubleshooting: Docker Network untuk Backend Express



## Problem: Network not found## Problem: Network `fabric-docker_default` not found



Error: `docker: Error response from daemon: network fablo_network_... not found`### Penyebab

Fablo menggunakan nama network dengan timestamp, bukan nama fixed `fabric-docker_default`.

### Solution:

Contoh nama network yang dibuat Fablo:

**1. Cek network yang ada:**- `fablo_network_202511111204_basic`

```bash- `fablo_network_202511111118_basic`

docker network ls | grep fablo

```### Solusi



**2. Gunakan network yang benar:**#### 1. Cek Nama Network Fabric yang Aktif

```bash```bash

# Contoh output: fablo_network_202511111204_basicdocker network ls | grep fablo

# Gunakan nama network tersebut```



docker run -d --name backend-express \Output contoh:

  --network fablo_network_202511111204_basic \```

  -p 8000:8000 \02212e6db1c4   fablo_network_202511111118_basic   bridge    local

  --env-file .env \d043a77edc3d   fablo_network_202511111204_basic   bridge    local

  backend-express:latest```

```

Gunakan yang paling baru (timestamp terbesar).

**3. ATAU gunakan host network (lebih mudah):**

```bash#### 2. Opsi A: Jalankan dengan Network yang Benar

docker run -d --name backend-express \

  --network host \```bash

  --env-file .env \# Ganti <NETWORK_NAME> dengan nama network dari langkah 1

  backend-express:latestdocker run -d \

```  --name backend-express \

  --network fablo_network_202511111204_basic \

Dengan host network, backend bisa langsung akses `localhost:7051`, `localhost:7054`, dll.  -p 8000:8000 \

  --env-file .env \

---  -v $(pwd)/logs:/app/logs \

  -v $(pwd)/wallet:/app/wallet \

## Problem: Docker not found (di dalam container)  -v ../fablo-target/fabric-config:/fabric-config:ro \

  --restart unless-stopped \

Error: `/bin/sh: docker: not found`  backend-express:latest

```

### Solution:

#### 3. Opsi B: Gunakan Host Network (Paling Mudah) ⭐

Mount Docker socket:

```bash**Keuntungan:**

docker run -d --name backend-express \- Tidak perlu tahu nama network

  -v /var/run/docker.sock:/var/run/docker.sock \- Backend bisa langsung akses Fabric di localhost

  ... # (other params)- Lebih simple untuk testing

```

**Cara:**

Ini membuat container bisa execute docker command ke host.```bash

docker run -d \

---  --name backend-express \

  --network host \

## Recommended Setup  -p 8000:8000 \

  --env-file .env \

**Pakai host network + Docker socket mounted:**  -v $(pwd)/logs:/app/logs \

  -v $(pwd)/wallet:/app/wallet \

```bash  -v ../fablo-target/fabric-config:/fabric-config:ro \

cd ~/apps/blockchain-batap/backend-express  --restart unless-stopped \

  backend-express:latest

docker stop backend-express 2>/dev/null```

docker rm backend-express 2>/dev/null

**Update `.env`:**

docker run -d \```env

  --name backend-express \FABRIC_CA_URL=http://localhost:7054

  --network host \FABRIC_PEER_URL=grpc://localhost:7051

  --env-file .env \FABRIC_ORDERER_URL=grpc://localhost:7050

  -v /var/run/docker.sock:/var/run/docker.sock \```

  -v $(pwd)/logs:/app/logs \

  -v $(pwd)/wallet:/app/wallet \#### 4. Opsi C: Jalankan Tanpa Docker (Pakai PM2)

  --restart unless-stopped \

  backend-express:latestJika Docker ribet, deploy manual lebih mudah:



docker logs -f backend-express```bash

```cd ~/apps/blockchain-batap/backend-express



Update .env untuk localhost:# Install dependencies

```envnpm install

FABRIC_CA_URL=http://localhost:7054

FABRIC_PEER_URL=grpc://localhost:7051# Edit .env (gunakan localhost)

FABRIC_ORDERER_URL=grpc://localhost:7050nano .env

``````


```env
PORT=8000
FABRIC_CA_URL=http://localhost:7054
FABRIC_PEER_URL=grpc://localhost:7051
FABRIC_ORDERER_URL=grpc://localhost:7050
# ... config lainnya
```

```bash
# Install PM2
sudo npm install -g pm2

# Start backend
pm2 start src/server.js --name backend-express

# Save
pm2 save
pm2 startup
```

## Cara Cepat Deploy (RECOMMENDED)

### Langkah 1: Cek Fabric Network Running
```bash
docker ps | grep -E "peer|orderer|ca"
```

Harus ada container:
- orderer
- peer0.upps
- peer0.sekretariat
- ca.upps
- ca.sekretariat

### Langkah 2: Deploy Backend Express dengan Host Network
```bash
cd ~/apps/blockchain-batap/backend-express

# Setup .env
cp .env.example .env
nano .env
```

Edit `.env`:
```env
PORT=8000
NODE_ENV=production

# Fabric (gunakan localhost karena host network)
FABRIC_CA_URL=http://localhost:7054
FABRIC_PEER_URL=grpc://localhost:7051
FABRIC_ORDERER_URL=grpc://localhost:7050
FABRIC_CHANNEL_NAME=akreditasi
FABRIC_CHAINCODE_NAME=submission-contract
FABRIC_MSP_ID=sekretariatMSP
FABRIC_USER_ID=admin

# API Keys
GEMINI_API_KEY=your_key_here
PINATA_JWT=your_jwt_here

# CORS
ALLOWED_ORIGINS=http://YOUR_VPS_IP,http://YOUR_VPS_IP:5173
```

### Langkah 3: Build & Run
```bash
# Build image
docker build -t backend-express:latest .

# Run dengan host network
docker run -d \
  --name backend-express \
  --network host \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/wallet:/app/wallet \
  --restart unless-stopped \
  backend-express:latest
```

### Langkah 4: Test
```bash
# Test health
curl http://localhost:8000/health

# Test API
curl http://localhost:8000/api/v1

# Cek logs
docker logs -f backend-express
```

## Catatan Penting

### Port Mapping vs Host Network

**Port Mapping (`-p 8000:8000`):**
- Container isolated
- Perlu tahu nama network untuk akses container lain
- Lebih aman

**Host Network (`--network host`):**
- Container langsung pakai network host
- Bisa akses localhost langsung
- Lebih mudah untuk development/testing
- **Recommended untuk VPS single server**

### MSP ID yang Benar

Cek di `fablo-config.json` atau connection profile, MSP ID bisa:
- `UppsMSP` (untuk org Upps)
- `sekretariatMSP` (untuk org Sekretariat)

Pastikan sesuai dengan organization yang digunakan!

## Quick Commands

```bash
# Stop container
docker stop backend-express && docker rm backend-express

# Rebuild & restart
cd ~/apps/blockchain-batap/backend-express
docker build -t backend-express:latest .
docker run -d --name backend-express --network host --env-file .env -v $(pwd)/logs:/app/logs -v $(pwd)/wallet:/app/wallet --restart unless-stopped backend-express:latest

# View logs
docker logs -f backend-express

# Check container
docker ps | grep backend-express
```
