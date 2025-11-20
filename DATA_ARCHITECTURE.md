# 📊 Data Architecture: On-Chain vs Off-Chain

## Overview

Sistem akreditasi blockchain ini menggunakan **hybrid architecture**: data penting dan immutable disimpan di blockchain, sedangkan data sensitif dan mutable disimpan di PostgreSQL.

---

## 🔗 ON-CHAIN DATA (Blockchain - Hyperledger Fabric)

### ✅ Data yang Disimpan di Blockchain:

| Data | Alasan |
|------|--------|
| **Submission ID** | Identifier unik, perlu traceable |
| **Timestamp** (upload, approve) | Audit trail, tidak boleh diubah |
| **Program Studi & Institusi** | Metadata akreditasi, publik |
| **Document Hash (SHA-256)** | Proof of integrity, verifikasi keaslian |
| **IPFS CID** | Reference ke file terenkripsi |
| **AI Scoring Results** | Hasil penilaian, tidak boleh dimanipulasi |
| **Accreditation Decision** | Keputusan final, harus immutable |
| **Approval Info** | Siapa approve, kapan approve |
| **Status** | PENDING, APPROVED, REJECTED |

### Keuntungan ON-CHAIN:
- ✅ **Immutable** - Tidak bisa diedit/dihapus
- ✅ **Traceable** - Full audit trail
- ✅ **Distributed** - Multi-party consensus
- ✅ **Transparent** - Semua pihak bisa verify
- ✅ **Non-repudiation** - Tidak bisa dibantah

### Contoh Data:
```json
{
  "submissionId": "8e8fd984-5ad8-4b7e-ad5f-8d1db7c676df",
  "timestamp": "2025-11-18T14:30:00.000Z",
  "programStudi": "TEKNIK INDUSTRI PERTANIAN",
  "institusi": "INSTITUT PERTANIAN BOGOR",
  "documents": {
    "LED": {
      "cid": "bafybeih7n74xqount34aqylbwlp43rj...",
      "hash": "abc123def456...",
      "filename": "LED_TIP_2025.pdf"
    }
  },
  "ai": {
    "scoring": {
      "overallScore": 2.81,
      "kriteria1_score": 3.25,
      "kriteria2_score": 2.14
    }
  },
  "status": "APPROVED",
  "decision": "APPROVED",
  "grade": "A"
}
```

---

## 💾 OFF-CHAIN DATA (PostgreSQL)

### ✅ Data yang Disimpan di Database:

| Table | Data | Alasan |
|-------|------|--------|
| **encryption_keys** | AES keys, IVs | CRITICAL! Harus persist, private |
| **users** | Email, password hash, profiles | Auth/authz, mutable |
| **sessions** | JWT tokens, login info | Temporary, stateful |
| **audit_logs** | Detailed activity logs | Too verbose untuk blockchain |
| **submission_metadata** | File size, MIME types, IP address | Technical details, tidak perlu blockchain |
| **analytics** | Usage statistics, metrics | Aggregated data, mutable |
| **notifications** | User notifications | Temporary, per-user |

### Keuntungan OFF-CHAIN:
- ✅ **Mutable** - Bisa diupdate (user profile, dll)
- ✅ **Private** - Tidak exposed ke semua pihak
- ✅ **Fast queries** - SQL indexing & joins
- ✅ **Cost-effective** - Tidak perlu gas fee
- ✅ **Scalable** - Easy to replicate/shard

### Schema PostgreSQL:

```sql
-- CRITICAL: Encryption keys
CREATE TABLE encryption_keys (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    encryption_key TEXT NOT NULL,  -- Base64 encoded
    encryption_iv TEXT NOT NULL,    -- Base64 encoded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id, document_type)
);

-- User accounts
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) CHECK (role IN ('upps', 'sekretariat', 'admin')),
    name VARCHAR(255),
    institution VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs (detailed)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extended metadata
CREATE TABLE submission_metadata (
    id SERIAL PRIMARY KEY,
    submission_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    file_metadata JSONB,  -- File sizes, MIME types, etc.
    processing_logs JSONB,  -- Upload/encryption logs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔄 Data Flow

### Upload Flow:

```
1. User uploads LED + LKPS
   ↓
2. Backend validates files
   ↓
3. Generate SHA-256 hash (will go to blockchain)
   ↓
4. Generate encryption key + IV
   ↓
5. Encrypt files with AES-256-CBC
   ↓
6. Upload encrypted files to IPFS → get CID
   ↓
7. Store encryption key in PostgreSQL ← OFF-CHAIN
   ↓
8. Store submission + hash + CID in Blockchain ← ON-CHAIN
   ↓
9. AI analysis (results go to blockchain)
```

### Download Flow:

```
1. User requests download
   ↓
2. Backend gets CID from Blockchain
   ↓
3. Backend gets encryption key from PostgreSQL ← OFF-CHAIN
   ↓
4. Download encrypted file from IPFS
   ↓
5. Decrypt file with key + IV
   ↓
6. Send decrypted file to user
```

---

## 🔐 Why This Hybrid Approach?

### Problem dengan ALL ON-CHAIN:
- ❌ Encryption keys di blockchain = security risk
- ❌ User passwords di blockchain = exposed
- ❌ Too much data = expensive & slow
- ❌ Personal data = privacy violation (GDPR)

### Problem dengan ALL OFF-CHAIN:
- ❌ Tidak ada immutability
- ❌ Tidak ada distributed consensus
- ❌ Single point of failure
- ❌ Bisa dimanipulasi admin

### Solution: HYBRID! ✅
```
Blockchain (ON-CHAIN):
→ Immutable records
→ Audit trail
→ Proof of integrity
→ Transparent decisions

PostgreSQL (OFF-CHAIN):
→ Private keys
→ User credentials
→ Mutable metadata
→ Fast queries
```

---

## 📊 Data Size Comparison

### Blockchain (On-Chain):
```
Per submission: ~5-10 KB
- Metadata: 2 KB
- Hashes: 64 bytes × 2 = 128 bytes
- CIDs: ~100 bytes × 2 = 200 bytes
- Scoring: 2-3 KB
- Decision: 1 KB

1000 submissions = ~10 MB
→ Small, manageable
```

### PostgreSQL (Off-Chain):
```
Per submission:
- Encryption keys: 500 bytes (2 keys)
- User data: 1-2 KB
- Audit logs: 5-10 KB (detailed)
- Metadata: 2-5 KB

1000 submissions = ~20-50 MB
→ Reasonable size, easy to backup
```

### IPFS (Files):
```
Per submission:
- LED PDF: 2-5 MB (encrypted)
- LKPS Excel: 500 KB - 2 MB (encrypted)

1000 submissions = ~3-7 GB
→ Distributed storage (Pinata Cloud)
```

---

## 🎯 Best Practices

### DO:
- ✅ Store hashes on blockchain (not files)
- ✅ Store encryption keys off-chain (PostgreSQL)
- ✅ Store immutable decisions on blockchain
- ✅ Store user credentials off-chain
- ✅ Use IPFS for large files
- ✅ Encrypt sensitive files before IPFS

### DON'T:
- ❌ Store encryption keys on blockchain
- ❌ Store large files on blockchain
- ❌ Store personal data (GDPR) on blockchain
- ❌ Store mutable data on blockchain
- ❌ Upload unencrypted files to IPFS

---

## 🚀 Migration Guide

### From In-Memory to PostgreSQL:

```bash
# 1. Setup PostgreSQL
cd backend-express
docker-compose -f docker-compose.db.yml up -d

# 2. Update .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=akreditasi
DB_USER=lamtek
DB_PASSWORD=lamtek_secure_2025

# 3. Install dependencies
npm install pg

# 4. Restart backend
npm start

# 5. Test upload (key will go to PostgreSQL)
# 6. Test restart (key survives restart!)
# 7. Test download (key retrieved from PostgreSQL)
```

### Verify:

```bash
# Check keys in database
docker exec postgres-akreditasi psql -U lamtek -d akreditasi \
  -c "SELECT submission_id, document_type, created_at FROM encryption_keys;"
```

---

## 📈 Scalability

### PostgreSQL:
- Vertical scaling: Increase CPU/RAM
- Horizontal scaling: Read replicas
- Sharding: Partition by institution/year
- **Expected**: Handle 10K+ submissions easily

### Blockchain:
- Peer scalability: Add more peers
- Channel scalability: Separate channels per region
- **Expected**: handle 100K+ transactions/day

### IPFS:
- Distributed by design
- Add more nodes for redundancy
- **Expected**: unlimited file storage

---

## 🔍 Query Examples

### Blockchain Query:
```bash
# Get submission from blockchain
peer chaincode query \
  -C akreditasi \
  -n submission-contract \
  -c '{"function":"getSubmission","Args":["8e8fd984-..."]}'

# Returns: metadata, hashes, CIDs, scoring
```

### PostgreSQL Query:
```sql
-- Get encryption key
SELECT encryption_key, encryption_iv 
FROM encryption_keys 
WHERE submission_id = '8e8fd984-...' 
  AND document_type = 'LED';

-- Get user info
SELECT name, institution, role 
FROM users 
WHERE email = 'upps@tip.ipb.ac.id';

-- Audit trail
SELECT action, details, created_at 
FROM audit_logs 
WHERE entity_id = '8e8fd984-...'
ORDER BY created_at DESC;
```

---

**Summary:**

🔗 **Blockchain** = Truth & Transparency  
💾 **PostgreSQL** = Privacy & Performance  
☁️ **IPFS** = Decentralized Storage  

= **Best of All Worlds!** ✨
