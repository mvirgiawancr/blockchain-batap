# Quick Fix: Docker Not Found Error# Quick Fix: Blockchain Storage Failed - Docker Not Found



## Problem## Root Cause

```Backend container mencoba menjalankan `docker exec` tapi Docker CLI tidak tersedia di dalam container.

/bin/sh: docker: not found

Blockchain submission failedError:

``````

/bin/sh: docker: not found

## Root Cause```

Backend container mencoba menjalankan `docker exec` tapi Docker CLI tidak tersedia di dalam container.

## Quick Fix: Mount Docker Socket

## Quick Fix

### Di VPS, restart backend dengan Docker socket mounted:

### Di VPS:

```bash

```bash# Stop container

# Stop backenddocker stop backend-express

docker stop backend-express && docker rm backend-expressdocker rm backend-express



# Restart dengan Docker socket mounted# Restart dengan Docker socket

cd ~/apps/blockchain-batap/backend-expresscd ~/virgi-test/blockchain-batap/backend-express

docker run -d \

docker run -d \  --name backend-express \

  --name backend-express \  --network fablo_network_202511111118_basic \

  --network fablo_network_XXXXXXXXXX_basic \  -p 8000:8000 \

  -p 8000:8000 \  --env-file .env \

  --env-file .env \  -v /var/run/docker.sock:/var/run/docker.sock \

  -v /var/run/docker.sock:/var/run/docker.sock \  -v $(pwd)/logs:/app/logs \

  -v $(pwd)/logs:/app/logs \  -v $(pwd)/wallet:/app/wallet \

  -v $(pwd)/wallet:/app/wallet \  --restart unless-stopped \

  --restart unless-stopped \  backend-express:latest

  backend-express:latest

# Monitor logs

# Monitor logsdocker logs -f backend-express

docker logs -f backend-express```

```

**Key change:** Tambah `-v /var/run/docker.sock:/var/run/docker.sock`

**Key change:** Tambah `-v /var/run/docker.sock:/var/run/docker.sock`

### Test lagi dari frontend

### Test

Upload file lagi dan cek apakah blockchain storage berhasil.

Upload file lagi dari frontend. Blockchain storage seharusnya berhasil sekarang!

---

---

## Alternative: Install Docker CLI di Container

## One-Liner

Jika mount socket tidak work, install Docker CLI di container:

```bash

docker stop backend-express && docker rm backend-express && cd ~/apps/blockchain-batap/backend-express && docker run -d --name backend-express --network host --env-file .env -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd)/logs:/app/logs -v $(pwd)/wallet:/app/wallet --restart unless-stopped backend-express:latest && docker logs -f backend-express### Update Dockerfile:

```

```dockerfile
FROM node:18-alpine

# Install Docker CLI
RUN apk add --no-cache docker-cli

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
```

Rebuild:
```bash
cd ~/virgi-test/blockchain-batap/backend-express
docker build -t backend-express:latest .

# Restart dengan Docker socket
docker stop backend-express && docker rm backend-express
docker run -d \
  --name backend-express \
  --network fablo_network_202511111118_basic \
  -p 8000:8000 \
  --env-file .env \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/wallet:/app/wallet \
  --restart unless-stopped \
  backend-express:latest
```

---

## Recommended: Refactor ke Fabric SDK (Long-term Fix)

File `fabricService.js` seharusnya pakai `fabric-network` SDK, bukan Docker CLI.

Keuntungan:
- Tidak perlu Docker socket
- Lebih secure
- Lebih proper
- Bisa jalan di mana saja

Tapi butuh refactor code yang lumayan banyak.

---

## One-Liner Quick Fix

```bash
docker stop backend-express && docker rm backend-express && cd ~/virgi-test/blockchain-batap/backend-express && docker run -d --name backend-express --network fablo_network_202511111118_basic -p 8000:8000 --env-file .env -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd)/logs:/app/logs -v $(pwd)/wallet:/app/wallet --restart unless-stopped backend-express:latest && docker logs -f backend-express
```

Coba ini dulu, upload lagi, dan lihat hasilnya! 🚀
