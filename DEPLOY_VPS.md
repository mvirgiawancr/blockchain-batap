# Deploy ke VPS - Quick Guide

## 🚀 Deploy Backend (Express)

### Start Backend
```bash
# SSH ke VPS
ssh user@your-vps-ip

# Masuk ke project
cd /path/to/blockchain-new

# Pastikan blockchain sudah running
cd fablo-target/fabric-docker
./fabric-docker.sh start
cd ~/virgi-test/blockchain-batap/backend-express
docker build -t backend-express:latest .
# Deploy backend dengan Docker
docker run -d \
  --name backend-express \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/backend-express/.env:/app/.env \
  -v $(pwd)/fablo-target:/app/fablo-target \
  -v $(pwd)/wallet:/app/wallet \
  --restart unless-stopped \
  backend-express:latest

# Atau tanpa Docker (langsung PM2)
cd backend-express
npm install --production
pm2 start src/server.js --name backend-express
pm2 save
```

### Stop Backend
```bash
# Jika pakai Docker
docker stop backend-express
docker rm backend-express

# Jika pakai PM2
pm2 stop backend-express
pm2 delete backend-express
```

### Logs Backend
```bash
# Docker logs
docker logs -f backend-express

# PM2 logs
pm2 logs backend-express
```

---

## 🎨 Deploy Frontend (React)

### Build Frontend
```bash
cd frontend

# PENTING: Ganti YOUR_VPS_IP dengan IP VPS asli!
# Contoh: 103.127.132.115 atau domain.com

# Edit .env.production untuk VPS
cat > .env.production << 'EOF'
VITE_API_URL=http://YOUR_VPS_IP:8000/api/v1
VITE_WS_URL=ws://YOUR_VPS_IP:8000
EOF

# Build production
npm run build
# Output: dist/

# ⚠️ ATAU pakai Nginx proxy (recommended) - tidak perlu IP di frontend
# Ubah .env.production jadi:
cat > .env.production << 'EOF'
VITE_API_URL=/api/v1
VITE_WS_URL=/ws
EOF
# Dengan config ini, frontend akan akses backend via Nginx proxy
# Browser akan hit: http://YOUR_VPS_IP/api/v1 → Nginx proxy ke localhost:8000
```

### Deploy ke Nginx (Root Path)

#### 1. Install Nginx (jika belum)
```bash
sudo apt update
sudo apt install nginx -y
```

#### 2. Config Nginx
```bash
sudo nano /etc/nginx/sites-available/akrechain
```

**Isi config:**
```nginx
server {
    listen 80 default_server;
    server_name YOUR_VPS_IP;

    # PENTING: Increase upload size limit untuk LED/LKPS (default 1MB terlalu kecil!)
    client_max_body_size 100M;  # Allow up to 100MB files
    client_body_timeout 300s;   # 5 minutes timeout for large uploads

    # Frontend root
    root /var/www/akrechain;
    index index.html;

    # SPA routing - semua request ke index.html
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Static assets cache
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:8000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Increase timeouts for large file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

#### 3. Build & Deploy
```bash
# Di VPS, masuk ke project folder
cd ~/virgi-test/blockchain-batap/frontend

# Buat .env.production (pakai Nginx proxy - recommended)
cat > .env.production << 'EOF'
VITE_API_URL=/api/v1
VITE_WS_URL=/ws
EOF

# Install dependencies (jika belum)
npm install

# Build production
npm run build

# Copy ke Nginx
sudo mkdir -p /var/www/akrechain
sudo cp -r dist/* /var/www/akrechain/

# Set permissions
sudo chown -R www-data:www-data /var/www/akrechain
sudo chmod -R 755 /var/www/akrechain

# Verify files copied
ls -la /var/www/akrechain
```

#### 4. Enable & Restart Nginx
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/akrechain /etc/nginx/sites-enabled/

# Remove default (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart
sudo systemctl restart nginx
```

#### 5. Akses Frontend
```
http://YOUR_VPS_IP
http://YOUR_VPS_IP/upps
http://YOUR_VPS_IP/sekretariat
```

---

## 🛑 Stop Semua Services

```bash
# Stop Frontend (Nginx)
sudo systemctl stop nginx

# Stop Backend
docker stop backend-express
# atau
pm2 stop backend-express

# Stop Blockchain
cd fablo-target/fabric-docker
./fabric-docker.sh stop

# ATAU Stop & Hapus semua container
./fabric-docker.sh down
```

---

## 🔄 Restart Services

```bash
# Start Blockchain
cd fablo-target/fabric-docker
./fabric-docker.sh start

# Start Backend
docker start backend-express
# atau
pm2 start backend-express

# Start Nginx
sudo systemctl start nginx
```

---

## 📊 Check Status

```bash
# Backend status
docker ps | grep backend-express
# atau
pm2 status

# Nginx status
sudo systemctl status nginx

# Blockchain status
docker ps | grep peer
docker ps | grep orderer

# Check ports
sudo netstat -tulpn | grep -E ':(80|8000|7041|7061)'
```

---

## 🐛 Troubleshooting

### Error 413 Payload Too Large
```bash
# Fix: Increase Nginx upload limit
sudo nano /etc/nginx/sites-available/akrechain

# Tambahkan di dalam server block:
client_max_body_size 100M;
client_body_timeout 300s;

# Test & restart
sudo nginx -t
sudo systemctl restart nginx
```

### Frontend tidak muncul
```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Check file permissions
ls -la /var/www/akrechain

# Check Nginx config syntax
sudo nginx -t
```

### 404 saat refresh halaman
```bash
# Pastikan try_files sudah benar di Nginx config
location / {
    try_files $uri $uri/ /index.html; # ← Ini penting untuk SPA!
}
```

### WebSocket connection failed
```bash
# Check Nginx WebSocket proxy config
# Update frontend .env.production:
VITE_WS_URL=ws://YOUR_VPS_IP/ws

# Nginx config harus ada:
location /ws {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

---

## 📝 Notes

### Tentang CLI Exec
Ya, sistem masih pakai **docker exec CLI approach** untuk Fabric:
- `fabricService.js` → `docker exec cli.upps.akreditasi.local peer chaincode invoke...`
- Lebih simple, tidak perlu wallet/MSP management di Node.js
- Cukup mount Docker socket: `-v /var/run/docker.sock:/var/run/docker.sock`

### Frontend di Root Path
- ✅ Akses langsung di IP tanpa subpath
- ✅ URL lebih simple & clean
- ✅ Tidak perlu konfigurasi base path di Vite

### Production Checklist
- [ ] Replace `YOUR_VPS_IP` dengan IP asli
- [ ] Update `backend-express/.env` untuk production (CORS_ORIGINS, dll)
- [ ] Enable firewall: `sudo ufw allow 80/tcp`
- [ ] Setup SSL (Let's Encrypt) untuk HTTPS
- [ ] Backup blockchain data: `/var/hyperledger/production`
- [ ] Monitor logs: `pm2 logs`, `docker logs`, `nginx error.log`

---

## 🔐 Bonus: SSL dengan Let's Encrypt (Optional)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL cert (jika ada domain)
sudo certbot --nginx -d yourdomain.com

# Nginx akan auto update config untuk HTTPS
# Frontend akan bisa diakses: https://yourdomain.com
```

Jika pakai IP (bukan domain), SSL tidak bisa pakai Let's Encrypt. Bisa pakai self-signed cert atau akses via HTTP saja.
