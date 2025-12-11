# ✅ PostgreSQL Migration - COMPLETED

## 🎉 Status: ACTIVE

Sistem sekarang menggunakan **PostgreSQL** untuk menyimpan encryption keys, bukan lagi in-memory storage.

---

## 🔄 Apa yang Berubah?

### SEBELUM (In-Memory):
```javascript
// Keys stored in RAM
this.keys = new Map();
// ❌ Hilang saat restart!
// ❌ Tidak persistent
// ❌ Tidak scalable
```

### SEKARANG (PostgreSQL):
```javascript
// Keys stored in database
await query('INSERT INTO encryption_keys...');
// ✅ Persistent across restarts!
// ✅ Scalable
// ✅ Production-ready
```

---

## 📊 Database Schema

### Table: `encryption_keys`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key (auto-increment) |
| `submission_id` | VARCHAR(255) | Submission ID (UUID) |
| `document_type` | VARCHAR(50) | LED atau LKPS |
| `encryption_key` | TEXT | AES-256 encryption key (hex) |
| `encryption_iv` | TEXT | Initialization vector (hex) |
| `cid` | TEXT | IPFS CID (optional) |
| `created_at` | TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | Last updated timestamp |

**Indexes:**
- UNIQUE constraint: `(submission_id, document_type)`
- Index: `idx_encryption_keys_submission` on `submission_id`
- Index: `idx_encryption_keys_document_type` on `document_type`

---

## 🚀 Quick Start

### 1. PostgreSQL Sudah Running
```bash
# Check status
docker ps | grep postgres

# Expected output:
# postgres-akreditasi    Up X minutes (healthy)
```

### 2. Verify Connection
```bash
# Test connection
docker exec postgres-akreditasi psql -U lamtek -d akreditasi -c "SELECT NOW();"

# List tables
docker exec postgres-akreditasi psql -U lamtek -d akreditasi -c "\dt"

# Check encryption_keys table
docker exec postgres-akreditasi psql -U lamtek -d akreditasi -c "SELECT COUNT(*) FROM encryption_keys;"
```

### 3. Backend Configuration
File `.env` sudah configured:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=akreditasi
DB_USER=lamtek
DB_PASSWORD=lamtek_secure_2025
```

---

## 🧪 Testing

### Test 1: Upload Document (Store Key)
```bash
# Upload LED + LKPS
curl -X POST http://localhost:8000/api/v1/upload \
  -F "programStudi=TEST" \
  -F "institusi=TEST_UNIV" \
  -F "jenjang=M" \
  -F "ledFile=@/path/to/led.pdf" \
  -F "lkpsFile=@/path/to/lkps.xlsx"

# Check if keys stored in database
docker exec postgres-akreditasi psql -U lamtek -d akreditasi \
  -c "SELECT submission_id, document_type, created_at FROM encryption_keys ORDER BY created_at DESC LIMIT 5;"
```

### Test 2: Restart Backend (Critical!)
```bash
# 1. Upload document
# 2. Get submission ID
# 3. Restart backend
npm run dev

# 4. Try to download - should work!
curl http://localhost:8000/api/v1/download/{submissionId}/LED -o downloaded.pdf

# ✅ Success = Keys persisted!
# ❌ Failure = Keys lost (shouldn't happen now)
```

### Test 3: Check Database Stats
```bash
# Via API
curl http://localhost:8000/health

# Should show:
{
  "database": {
    "status": "healthy",
    "keysStored": X,
    "storageType": "PostgreSQL"
  }
}
```

---

## 📈 Monitoring

### Query Examples

```sql
-- Total keys
SELECT COUNT(*) FROM encryption_keys;

-- Keys by document type
SELECT document_type, COUNT(*) 
FROM encryption_keys 
GROUP BY document_type;

-- Recent keys
SELECT submission_id, document_type, created_at 
FROM encryption_keys 
ORDER BY created_at DESC 
LIMIT 10;

-- Keys for specific submission
SELECT * FROM encryption_keys 
WHERE submission_id = 'YOUR-SUBMISSION-ID';

-- Database size
SELECT pg_size_pretty(pg_database_size('akreditasi'));

-- Table size
SELECT pg_size_pretty(pg_total_relation_size('encryption_keys'));
```

---

## 🔐 Security Best Practices

### 1. Change Default Password (Production)
```env
# In .env
DB_PASSWORD=your_strong_password_here_min_16_chars
```

### 2. Backup Database
```bash
# Manual backup
docker exec postgres-akreditasi pg_dump -U lamtek akreditasi > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i postgres-akreditasi psql -U lamtek akreditasi < backup_20251124.sql
```

### 3. Enable SSL (Production)
```javascript
// src/config/database.js
ssl: {
  rejectUnauthorized: true,
  ca: fs.readFileSync('/path/to/ca-cert.pem').toString()
}
```

### 4. Setup Automated Backups
```bash
# Create backup script
cat > /etc/cron.daily/postgres-backup << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/akreditasi"
mkdir -p $BACKUP_DIR
docker exec postgres-akreditasi pg_dump -U lamtek akreditasi | gzip > $BACKUP_DIR/akreditasi_$(date +%Y%m%d).sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /etc/cron.daily/postgres-backup
```

---

## 🐛 Troubleshooting

### Issue: "Connection refused"
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs postgres-akreditasi

# Restart container
docker restart postgres-akreditasi
```

### Issue: "Authentication failed"
```bash
# Verify credentials in .env match docker-compose.db.yml
cat .env | grep DB_
cat docker-compose.db.yml | grep POSTGRES_
```

### Issue: "Table does not exist"
```bash
# Re-run init script
docker exec -i postgres-akreditasi psql -U lamtek -d akreditasi < init-db.sql
```

### Issue: "Column encryption_iv not found"
```bash
# Check table structure
docker exec postgres-akreditasi psql -U lamtek -d akreditasi -c "\d encryption_keys"

# Expected columns: encryption_key, encryption_iv (NOT just "iv")
```

---

## 📝 Rollback Plan (Jika Needed)

Jika ada masalah dan perlu rollback ke in-memory:

1. **Edit `src/services/encryptionKeyService.js`**:
   - Uncomment old in-memory code
   - Comment PostgreSQL code

2. **Restart backend**:
   ```bash
   npm run dev
   ```

3. **Note**: Data yang sudah di PostgreSQL akan tetap ada, tapi tidak akan digunakan.

---

## ✅ Verification Checklist

- [x] PostgreSQL container running
- [x] Database `akreditasi` exists
- [x] Table `encryption_keys` created with correct schema
- [x] Backend connects to PostgreSQL successfully
- [x] Keys stored in database (not in-memory)
- [x] Keys persisted after backend restart
- [x] Download works after restart (critical test)

---

## 📚 Related Files

- `src/services/encryptionKeyService.js` - Main service (uses PostgreSQL)
- `src/config/database.js` - PostgreSQL connection pool
- `docker-compose.db.yml` - PostgreSQL container config
- `init-db.sql` - Database initialization script
- `.env` - Database credentials

---

## 🎯 Next Steps

### Immediate (Optional):
1. Change default password in production
2. Setup automated backups
3. Monitor database size

### Future Enhancements:
1. Migrate to Fabric Private Data Collections (blockchain-native)
2. Implement database replication (high availability)
3. Add encryption at rest
4. Setup monitoring (Prometheus + Grafana)

---

**Migration Status**: ✅ **COMPLETED**  
**Migration Date**: 24 November 2025  
**Backend Status**: Using PostgreSQL for encryption keys  
**Data Loss Risk**: None (keys now persistent)

---

*Untuk pertanyaan atau masalah, cek logs:*
```bash
# Backend logs
cat logs/combined.log | tail -50

# PostgreSQL logs
docker logs postgres-akreditasi
```
