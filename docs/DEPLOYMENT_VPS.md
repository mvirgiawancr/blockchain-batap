# Panduan Deployment ke VPS

## Ringkasan Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPS SERVER                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐│
│  │   NGINX     │◄──│  FRONTEND   │   │  HYPERLEDGER FABRIC     ││
│  │  (port 80)  │   │ (port 3000) │   │  - Orderer              ││
│  └─────────────┘   └─────────────┘   │  - Peer0 UPPS           ││
│                           │          │  - Peer0 Sekretariat    ││
│                           ▼          │  - CouchDB              ││
│                    ┌─────────────┐   │  - CA                   ││
│                    │  BACKEND    │   │  - Explorer             ││
│                    │ (port 8000) │◄──┤                         ││
│                    └─────────────┘   └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Langkah 1: Stop Semua Services

### 1.1 Stop Frontend (Nginx)

```bash
# Stop nginx service
sudo systemctl stop nginx

# Atau jika menggunakan container
docker stop lamtek-frontend 2>/dev/null || true
```

### 1.2 Stop Backend Express

```bash
docker stop lamtek-backend 2>/dev/null || true
docker rm lamtek-backend 2>/dev/null || true
```

### 1.3 Stop Semua Container (Opsional - Jika perlu restart Fabric)

> [!WARNING]
> Jalankan ini HANYA jika perlu restart ulang network Fabric. Data akan tetap tersimpan di volume.

```bash
# Stop semua container terkait aplikasi
docker stop lamtek-frontend lamtek-backend 2>/dev/null || true
docker rm lamtek-frontend lamtek-backend 2>/dev/null || true

# Jika perlu stop Fabric network juga (jarang diperlukan)
cd /home/virgi/blockchain-new/fablo-target/fabric-docker
./fabric-docker.sh stop
```

---

## Langkah 2: Pull Update dari Repository

```bash
cd /home/virgi/blockchain-new

# Pull latest changes
git pull origin main

# Atau jika ada branch spesifik
git pull origin <nama-branch>
```

---

## Langkah 3: Build Ulang Images

### 3.1 Build Backend

```bash
cd /home/virgi/blockchain-new

# Build backend image
docker build -t backend-express:latest ./backend-express

# Atau dengan docker-compose
docker-compose -f docker-compose.production.yml build backend
```

### 3.2 Build Frontend

```bash
# Set environment variable untuk API URL
export VITE_API_URL=http://<IP_VPS>:8000/api/v1

# Build frontend image
docker build \
  --build-arg VITE_API_URL=$VITE_API_URL \
  -t lamtek-frontend:latest \
  -f ./frontend/Dockerfile.production \
  ./frontend
```

---

## Langkah 4: Start Services

### 4.1 Pastikan Fabric Network Running

```bash
# Cek status Fabric containers
docker ps | grep -E "(peer|orderer|ca\.|couchdb)"

# Jika tidak running, start ulang
cd /home/virgi/blockchain-new/fablo-target/fabric-docker
./fabric-docker.sh start
```

### 4.2 Start Backend

```bash
cd /home/virgi/blockchain-new

# Menggunakan docker-compose
docker-compose -f docker-compose.production.yml up -d backend

# Atau manual
docker run -d \
  --name lamtek-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  -v $(pwd)/fablo-target:/app/fablo-target:ro \
  -v backend-wallet:/app/wallet \
  --network fablo-target_basic \
  --env-file ./backend-express/.env \
  -e NODE_ENV=production \
  backend-express:latest
```

### 4.3 Start Frontend

**Opsi A: Menggunakan Docker Container**
```bash
docker-compose -f docker-compose.production.yml up -d frontend
```

**Opsi B: Menggunakan Nginx (Recommended)**
```bash
# Copy build files ke nginx directory
sudo cp -r ./frontend/dist/* /var/www/html/

# Start nginx
sudo systemctl start nginx
```

---

## Langkah 5: Verifikasi Deployment

### 5.1 Cek Status Container

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected output:
```
NAMES               STATUS                   PORTS
lamtek-backend      Up X minutes (healthy)   0.0.0.0:8000->8000/tcp
lamtek-frontend     Up X minutes (healthy)   0.0.0.0:3000->3000/tcp
peer0.upps...       Up X weeks               ...
peer0.sekretariat.. Up X weeks               ...
...
```

### 5.2 Test Backend Health

```bash
curl http://localhost:8000/health
# Expected: {"status":"ok",...}
```

### 5.3 Test Frontend

```bash
curl -I http://localhost:3000
# Expected: HTTP/1.1 200 OK
```

### 5.4 Test Full Flow

```bash
# Test API endpoint
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## Langkah 6: Konfigurasi Nginx (Jika menggunakan Nginx)

### 6.1 Buat/Update Nginx Config

```bash
sudo nano /etc/nginx/sites-available/lamtek
```

```nginx
server {
    listen 80;
    server_name <IP_VPS> <DOMAIN>;

    # Frontend
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Proxy
    location /ws {
        proxy_pass http://localhost:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 6.2 Enable Site & Restart Nginx

```bash
sudo ln -sf /etc/nginx/sites-available/lamtek /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Quick Commands Reference

| Action | Command |
|--------|---------|
| Stop All | `docker-compose -f docker-compose.production.yml down` |
| Start All | `docker-compose -f docker-compose.production.yml up -d` |
| View Logs | `docker logs -f lamtek-backend` |
| Rebuild Backend | `docker-compose -f docker-compose.production.yml build backend` |
| Rebuild Frontend | `docker-compose -f docker-compose.production.yml build frontend` |
| Restart Backend | `docker restart lamtek-backend` |
| Check Health | `curl http://localhost:8000/health` |

---

## Troubleshooting

### Backend tidak bisa connect ke Fabric
```bash
# Pastikan backend terhubung ke network Fabric
docker network connect fablo-target_basic lamtek-backend
```

### Frontend tidak bisa akses API
```bash
# Cek CORS dan environment variable
docker logs lamtek-backend | grep -i cors
```

### Chaincode error
```bash
# Cek chaincode container
docker logs $(docker ps -q -f name=dev-peer0)
```
