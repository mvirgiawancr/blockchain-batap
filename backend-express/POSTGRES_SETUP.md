# PostgreSQL Setup & Migration Guide

## 🚀 Quick Start

### 1. Start PostgreSQL dengan Docker Compose

```bash
cd backend-express

# Start PostgreSQL
docker-compose -f docker-compose.db.yml up -d

# Check status
docker ps | grep postgres

# Check logs
docker logs postgres-akreditasi
```

### 2. Verify Database Connection

```bash
# Connect to PostgreSQL
docker exec -it postgres-akreditasi psql -U lamtek -d akreditasi

# Inside psql:
\dt                    # List tables
SELECT * FROM encryption_keys;  # View keys
\q                     # Quit
```

### 3. Update .env File

```bash
# Copy from example
cp .env.example .env

# Edit .env and set:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=akreditasi
DB_USER=lamtek
DB_PASSWORD=lamtek_secure_2025
```

### 4. Install Dependencies

```bash
npm install
# or
npm install pg
```

### 5. Start Backend

```bash
npm start
```

---

## 📊 Database Schema

### Tables Created:

1. **encryption_keys** - AES-256-CBC keys for IPFS files
2. **users** - User accounts (UPPS, Sekretariat, Admin)
3. **sessions** - Active user sessions
4. **audit_logs** - Detailed audit trail
5. **submission_metadata** - Extended submission data
6. **analytics** - Usage statistics
7. **notifications** - User notifications

---

## 🔄 Migration from In-Memory

### Before (In-Memory):
```javascript
// Keys stored in RAM
this.keys = new Map();
// Lost on restart! ❌
```

### After (PostgreSQL):
```javascript
// Keys stored in database
await query('INSERT INTO encryption_keys...');
// Persistent! ✅
```

---

## 🧪 Testing

### Test Database Connection:

```bash
# From project root
cd backend-express

# Run test query
docker exec postgres-akreditasi psql -U lamtek -d akreditasi -c "SELECT NOW();"
```

### Test Encryption Key Storage:

```bash
# Start backend
npm start

# In another terminal, test upload
curl -X POST http://localhost:8000/api/v1/upload \
  -F "programStudi=TEST" \
  -F "institusi=TEST_UNIV" \
  -F "jenjang=M" \
  -F "ledFile=@/path/to/test.pdf" \
  -F "lkpsFile=@/path/to/test.xlsx"

# Check keys in database
docker exec postgres-akreditasi psql -U lamtek -d akreditasi \
  -c "SELECT submission_id, document_type, created_at FROM encryption_keys;"
```

### Test Server Restart (Critical Test!):

```bash
# 1. Upload a document (key stored in DB)
# 2. Restart backend
npm start

# 3. Try to download the document
curl http://localhost:8000/api/v1/download/{submissionId}/LED

# ✅ Should work! (key retrieved from DB)
# ❌ With in-memory, would fail!
```

---

## 🔐 Security Best Practices

### Production Deployment:

1. **Change default password:**
```bash
# In .env
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE
```

2. **Enable SSL:**
```javascript
// src/config/database.js
ssl: {
  rejectUnauthorized: true,
  ca: fs.readFileSync('/path/to/ca-cert.pem').toString()
}
```

3. **Encrypt database at rest:**
```bash
# PostgreSQL Transparent Data Encryption (TDE)
# Or use encrypted volumes
```

4. **Backup regularly:**
```bash
# Backup
docker exec postgres-akreditasi pg_dump -U lamtek akreditasi > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i postgres-akreditasi psql -U lamtek akreditasi < backup_20251119.sql
```

---

## 📈 Monitoring

### Check Database Stats:

```sql
-- Total keys
SELECT COUNT(*) FROM encryption_keys;

-- Keys by document type
SELECT document_type, COUNT(*) FROM encryption_keys GROUP BY document_type;

-- Recent keys
SELECT submission_id, document_type, created_at 
FROM encryption_keys 
ORDER BY created_at DESC 
LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('akreditasi'));
```

---

## 🐛 Troubleshooting

### Issue: "Connection refused"

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs postgres-akreditasi

# Restart if needed
docker restart postgres-akreditasi
```

### Issue: "Authentication failed"

```bash
# Check credentials in .env match docker-compose.db.yml
# Default: user=lamtek, password=lamtek_secure_2025
```

### Issue: "Table not found"

```bash
# Re-run init script
docker exec -i postgres-akreditasi psql -U lamtek -d akreditasi < init-db.sql
```

---

## 🚀 Production Deployment (VPS)

### 1. Setup on VPS:

```bash
# SSH to VPS
ssh user@vps-ip

# Navigate to project
cd /path/to/blockchain-new/backend-express

# Start PostgreSQL
docker-compose -f docker-compose.db.yml up -d

# Update .env with production password
nano .env
```

### 2. External Access (if needed):

```yaml
# docker-compose.db.yml
ports:
  - "5432:5432"  # ⚠️  Only if accessing from external services

# Or use internal Docker network (more secure)
networks:
  - akreditasi-network
```

### 3. Backup Script:

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/var/backups/akreditasi"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/akreditasi_$DATE.sql"

mkdir -p $BACKUP_DIR

docker exec postgres-akreditasi pg_dump -U lamtek akreditasi > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

```bash
# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /path/to/backup-db.sh
```

---

## 📝 Next Steps

### Future Enhancements:

1. **Migrate to Fabric Private Data Collections** (for blockchain-native storage)
2. **Implement user authentication** (use `users` table)
3. **Add audit logging** (use `audit_logs` table)
4. **Setup monitoring** (Prometheus + Grafana)
5. **Enable replication** (master-slave setup)
