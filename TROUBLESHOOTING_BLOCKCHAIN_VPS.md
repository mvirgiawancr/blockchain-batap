# Troubleshooting Blockchain Storage di VPS# Troubleshooting Blockchain Storage Failed di VPS



## Common Issues & Solutions## Problem

- Upload berhasil di local

### 1. Network Connection Failed- Upload **failed di blockchain storage** di VPS

- Frontend menampilkan error setelah AI analysis selesai

**Error:** `Failed to connect to peer` / `ECONNREFUSED`

## Diagnosis

**Solution:**

```bash### 1. Cek Log Backend di VPS

# Gunakan host network```bash

docker stop backend-express && docker rm backend-express# SSH ke VPS dulu

ssh root@YOUR_VPS_IP

cd ~/apps/blockchain-batap/backend-express

nano .env  # Set FABRIC_*_URL ke localhost# Cek log backend untuk error detail

docker logs backend-express --tail 100 | grep -i "blockchain\|fabric\|error"

docker run -d --name backend-express --network host \

  --env-file .env \# Atau real-time

  -v /var/run/docker.sock:/var/run/docker.sock \docker logs -f backend-express

  -v $(pwd)/logs:/app/logs \```

  -v $(pwd)/wallet:/app/wallet \

  --restart unless-stopped \Cari error message seperti:

  backend-express:latest- `Failed to connect to peer`

```- `Failed to enroll admin`

- `Identity not found`

---- `Channel not found`

- `Chaincode not found`

### 2. Docker Not Found

### 2. Cek Fabric Network Running di VPS

**Error:** `/bin/sh: docker: not found````bash

# List semua container Fabric

**Solution:** Mount Docker socketdocker ps | grep -E "peer|orderer|ca"

```bash

docker run -d --name backend-express \# Expected containers:

  -v /var/run/docker.sock:/var/run/docker.sock \# - orderer0.orderer.batap.ac.id

  ... # (other params)# - peer0.upps.batap.ac.id

```# - peer0.sekretariat.batap.ac.id

# - ca.upps.batap.ac.id

---# - ca.sekretariat.batap.ac.id

```

### 3. Gemini API Overloaded

### 3. Test Koneksi ke Fabric Components

**Error:** `[503] The model is overloaded````bash

# Test koneksi ke CA

**Solution:**curl http://localhost:7054/cainfo

- Backend sudah ada auto-retry logic (3x dengan delay)

- Tunggu 10-30 detik, upload ulang# Expected: JSON response dengan CA info

- Ganti model di .env: `GEMINI_MODEL=gemini-1.5-flash`

# Test koneksi ke Orderer (dari dalam container backend)

**Expected log:**docker exec backend-express curl -k https://localhost:7050

```

[Gemini] Generating content (attempt 1/3)...# Test peer

[Gemini] ⚠️  Error: [503] overloadeddocker exec backend-express curl -k https://localhost:7051

[Gemini] Retrying in 1000ms...```

[Gemini] Generating content (attempt 2/3)...

[Gemini] ✅ Success### 4. Cek Environment Variables Backend

``````bash

# Cek env yang di-load di container

---docker exec backend-express env | grep FABRIC



### 4. Identity Not Found# Pastikan ada:

# FABRIC_CA_URL=http://...

**Error:** `Identity not found in wallet`# FABRIC_PEER_URL=grpc://...

# FABRIC_ORDERER_URL=grpc://...

**Solution:** Enroll admin# FABRIC_CHANNEL_NAME=akreditasi

```bash# FABRIC_CHAINCODE_NAME=submission-contract

# Masuk ke CLI container# FABRIC_MSP_ID=sekretariatMSP atau UppsMSP

docker exec -it cli.sekretariat.batap.ac.id bash```



# Enroll admin---

fabric-ca-client enroll -u http://admin:adminpw@ca.sekretariat.batap.ac.id:7054

## Kemungkinan Penyebab & Solusi

exit

```### Issue 1: Backend Tidak Bisa Connect ke Fabric (Network Issue)



---**Gejala:**

- Error: `Failed to connect to peer`

### 5. Channel/Chaincode Not Found- Error: `ECONNREFUSED`



**Error:** `Channel 'akreditasi' not found`**Penyebab:**

Backend container tidak dalam network yang sama dengan Fabric, atau hostname tidak resolve.

**Solution:**

```bash**Solusi:**

# Cek channel

docker exec cli.sekretariat.batap.ac.id peer channel list#### A. Jika pakai Docker Network

```bash

# Cek chaincode# Cek backend ada di network yang sama dengan Fabric

docker exec cli.sekretariat.batap.ac.id peer lifecycle chaincode queryinstalleddocker network inspect fablo_network_202511111118_basic | grep backend-express



# Jika belum ada, restart Fabric# Jika tidak ada, restart backend dengan network yang benar

cd ~/apps/blockchain-batap/fablo-target/fabric-dockerdocker stop backend-express

./fabric-docker.sh downdocker rm backend-express

./fabric-docker.sh up

```cd ~/virgi-test/blockchain-batap/backend-express

docker run -d \

---  --name backend-express \

  --network fablo_network_202511111118_basic \

## Diagnosis Commands  -p 8000:8000 \

  --env-file .env \

```bash  -v $(pwd)/logs:/app/logs \

# 1. Cek log backend  -v $(pwd)/wallet:/app/wallet \

docker logs -f backend-express  --restart unless-stopped \

  backend-express:latest

# 2. Cek Fabric network running```

docker ps | grep -E "peer|orderer|ca"

#### B. Jika pakai Host Network (Lebih Simple)

# 3. Test koneksi```bash

curl http://localhost:7054/cainfo  # CA# Stop backend

curl http://localhost:8000/health  # Backenddocker stop backend-express

docker rm backend-express

# 4. Cek env variables

docker exec backend-express env | grep FABRIC# Edit .env - gunakan localhost

nano .env

# 5. Test blockchain langsung```

docker exec -it cli.sekretariat.batap.ac.id bash

peer chaincode query -C akreditasi -n submission-contract -c '{"Args":["GetAllSubmissions"]}'Update `.env`:

exit```env

```FABRIC_CA_URL=http://localhost:7054

FABRIC_PEER_URL=grpc://localhost:7051

---FABRIC_ORDERER_URL=grpc://localhost:7050

```

## Complete Working Setup

```bash

```bash# Restart dengan host network

# 1. Start Fabricdocker run -d \

cd ~/apps/blockchain-batap/fablo-target/fabric-docker  --name backend-express \

./fabric-docker.sh up  --network host \

  --env-file .env \

# 2. Configure backend .env  -v $(pwd)/logs:/app/logs \

cd ~/apps/blockchain-batap/backend-express  -v $(pwd)/wallet:/app/wallet \

cat > .env << 'EOF'  --restart unless-stopped \

PORT=8000  backend-express:latest

NODE_ENV=production```

FABRIC_CA_URL=http://localhost:7054

FABRIC_PEER_URL=grpc://localhost:7051---

FABRIC_ORDERER_URL=grpc://localhost:7050

FABRIC_CHANNEL_NAME=akreditasi### Issue 2: User Identity Belum Terdaftar di Fabric CA

FABRIC_CHAINCODE_NAME=submission-contract

FABRIC_MSP_ID=sekretariatMSP**Gejala:**

FABRIC_USER_ID=admin- Error: `Failed to enroll admin`

FABRIC_WALLET_PATH=/app/wallet- Error: `Identity not found in wallet`

GEMINI_API_KEY=YOUR_KEY_HERE

PINATA_JWT=YOUR_JWT_HERE**Penyebab:**

CORS_ORIGINS=http://YOUR_VPS_IPAdmin user belum di-enroll ke Fabric CA, wallet kosong.

EOF

**Solusi:**

# 3. Run backend

docker stop backend-express 2>/dev/null```bash

docker rm backend-express 2>/dev/null# Masuk ke container backend

docker exec -it backend-express sh

docker run -d \

  --name backend-express \# Cek apakah wallet ada

  --network host \ls -la /app/wallet/

  --env-file .env \

  -v /var/run/docker.sock:/var/run/docker.sock \# Expected: folder sekretariat.id atau upps.id

  -v $(pwd)/logs:/app/logs \# Jika kosong, admin belum di-enroll

  -v $(pwd)/wallet:/app/wallet \```

  --restart unless-stopped \

  backend-express:latest**Enroll admin manual:**



# 4. Monitor```bash

docker logs -f backend-express# Dari VPS, masuk ke Fabric CLI container

```docker exec -it cli.sekretariat.batap.ac.id bash



---# Enroll admin

fabric-ca-client enroll -u http://admin:adminpw@ca.sekretariat.batap.ac.id:7054

## Expected Success Log

# Exit

```exit

[INFO] LED uploaded to IPFS: QmXXXXX...```

[INFO] LKPS uploaded to IPFS: QmYYYYY...

[Gemini] ✅ Content generated successfullyAtau buat script enroll di backend:

[INFO] Scoring complete: 285.5 / 400

[INFO] Storing submission on blockchain...```bash

[Fabric] Invoking CreateSubmission...cd ~/virgi-test/blockchain-batap/backend-express

[INFO] ✅ Submission stored on blockchain successfully

```# Buat script enroll-admin.js

nano scripts/enroll-admin.js

---```



## Still Having Issues?Isi dengan:

```javascript

1. Check logs: `docker logs backend-express --tail 100`const FabricCAServices = require('fabric-ca-client');

2. Verify Fabric running: `docker ps | grep peer`const { Wallets } = require('fabric-network');

3. Check environment: `docker exec backend-express env | grep FABRIC`const fs = require('fs');

4. Test manually: `docker exec -it cli.sekretariat.batap.ac.id bash`const path = require('path');



Share the error logs for further help!async function enrollAdmin() {

    try {
        // Load connection profile
        const ccpPath = path.resolve(__dirname, '..', '..', 'fablo-target', 'fabric-config', 'connection-profiles', 'connection-profile-sekretariat.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create CA client
        const caURL = ccp.certificateAuthorities['ca.sekretariat.batap.ac.id'].url;
        const ca = new FabricCAServices(caURL);

        // Create wallet
        const walletPath = path.join(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if admin exists
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('Admin already enrolled');
            return;
        }

        // Enroll admin
        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'sekretariatMSP',
            type: 'X.509',
        };

        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin user and imported into wallet');

    } catch (error) {
        console.error('Failed to enroll admin:', error);
        process.exit(1);
    }
}

enrollAdmin();
```

Run script:
```bash
# Install dependencies jika belum
npm install

# Run enroll script
node scripts/enroll-admin.js

# Cek wallet
ls -la wallet/
```

---

### Issue 3: Channel atau Chaincode Belum Initialized

**Gejala:**
- Error: `Channel 'akreditasi' not found`
- Error: `Chaincode 'submission-contract' not found`

**Solusi:**

```bash
# Cek channel ada
docker exec cli.sekretariat.batap.ac.id peer channel list

# Expected output: akreditasi

# Cek chaincode installed
docker exec cli.sekretariat.batap.ac.id peer lifecycle chaincode queryinstalled

# Expected: submission-contract

# Jika chaincode belum ada, install dulu
cd ~/virgi-test/blockchain-batap/chaincode/submission-contract
npm install

# Package chaincode
cd ../../fablo-target/fabric-docker
./fabric-docker.sh install-chaincode
```

---

### Issue 4: MSP ID Salah

**Gejala:**
- Error: `MSP ID mismatch`
- Error: `Org not found`

**Penyebab:**
Environment variable `FABRIC_MSP_ID` tidak sesuai dengan organization.

**Solusi:**

Cek MSP ID yang benar:
```bash
# Lihat connection profile
cat ~/virgi-test/blockchain-batap/fablo-target/fabric-config/connection-profiles/connection-profile-sekretariat.json | grep mspid
```

Update `.env`:
```env
# Untuk Sekretariat
FABRIC_MSP_ID=sekretariatMSP

# ATAU untuk Upps
FABRIC_MSP_ID=UppsMSP
```

---

### Issue 5: Gemini API Error - Model Overloaded (503)

**Gejala:**
- Error: `503 Service Unavailable - The model is overloaded`
- Error: `429 Too Many Requests - Resource exhausted`
- AI analysis gagal meskipun di local jalan normal

**Penyebab:**
- Google Gemini API sedang **overload** (terlalu banyak request)
- Biasanya terjadi pada **free tier** atau peak hours
- **Temporary issue** dari sisi Google, bukan bug aplikasi

**Solusi:**

Backend sudah dilengkapi **retry logic dengan exponential backoff**.

Jika masih error:

#### A. Cek Quota API Key
```bash
# Login ke Google AI Studio
# https://makersuite.google.com/app/apikey

# Cek usage dan limits API key Anda
# Pastikan belum exceed quota
```

#### B. Gunakan Model yang Lebih Kecil (Lebih Jarang Overload)
Edit `backend-express/.env`:
```env
# Ganti model dari gemini-2.5-flash ke gemini-1.5-flash
GEMINI_MODEL=gemini-1.5-flash

# Atau ke gemini-pro (lebih stabil tapi lebih lambat)
# GEMINI_MODEL=gemini-pro
```

#### C. Upgrade ke Paid Tier
Jika sering kena overload, upgrade ke paid tier:
- https://ai.google.dev/pricing
- Paid tier punya dedicated resources & higher quota

#### D. Retry Manual
Jika sekali error, tunggu 10-30 detik lalu upload ulang.
Backend akan otomatis retry 3x dengan delay.

**Expected Log saat Retry:**
```
[Gemini] Generating content (attempt 1/3)...
[Gemini] ⚠️  Error: [503] The model is overloaded
[Gemini] Retrying in 1000ms... (attempt 1/3)
[Gemini] Generating content (attempt 2/3)...
[Gemini] ✅ Content generated successfully
```

---

## Quick Fix Command (VPS)

Jalankan command ini secara berurutan di VPS:

```bash
# 1. Stop backend
docker stop backend-express && docker rm backend-express

# 2. Masuk ke folder backend
cd ~/virgi-test/blockchain-batap/backend-express

# 3. Edit .env - pakai localhost
nano .env
```

**Set .env ke:**
```env
PORT=8000
NODE_ENV=production

# Fabric - gunakan localhost karena host network
FABRIC_CA_URL=http://localhost:7054
FABRIC_PEER_URL=grpc://localhost:7051
FABRIC_ORDERER_URL=grpc://localhost:7050
FABRIC_CHANNEL_NAME=akreditasi
FABRIC_CHAINCODE_NAME=submission-contract
FABRIC_MSP_ID=sekretariatMSP
FABRIC_USER_ID=admin
FABRIC_USER_SECRET=adminpw
FABRIC_WALLET_PATH=/app/wallet
FABRIC_CONNECTION_PROFILE=/fabric-config/connection-profiles/connection-profile-sekretariat.json

# API Keys
GEMINI_API_KEY=your_actual_key
PINATA_JWT=your_actual_jwt

# CORS
CORS_ORIGINS=http://IP_VPS_ANDA
```

```bash
# 4. Restart dengan host network
docker run -d \
  --name backend-express \
  --network host \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/wallet:/app/wallet \
  -v $(pwd)/../fablo-target/fabric-config:/fabric-config:ro \
  --restart unless-stopped \
  backend-express:latest

# 5. Monitor logs
docker logs -f backend-express

# 6. Test upload dari frontend
```

---

## Testing & Verification

```bash
# 1. Cek backend health
curl http://localhost:8000/health

# 2. Cek Fabric network
docker ps | grep -E "peer|orderer|ca"

# 3. Cek logs saat upload
docker logs -f backend-express

# 4. Test langsung ke blockchain
docker exec -it cli.sekretariat.batap.ac.id bash
peer chaincode query -C akreditasi -n submission-contract -c '{"Args":["GetAllSubmissions"]}'
exit
```

---

## Expected Success Log

Jika berhasil, log harus seperti ini:
```
[INFO] Starting document upload...
[INFO] LED text extracted: 15234 characters
[INFO] LKPS text extracted: 8923 characters
[INFO] LED uploaded to IPFS: QmXXXXX...
[INFO] LKPS uploaded to IPFS: QmYYYYY...
[INFO] AI analysis completed successfully
[INFO] Scoring complete: Final Score = 285.5 / 400
[INFO] Storing submission on blockchain...
[INFO] Connected to Fabric network
[INFO] Submission stored on blockchain successfully  ✅
```

---

Jalankan diagnosis ini di VPS dan share hasil log-nya untuk troubleshooting lebih lanjut! 🔍
