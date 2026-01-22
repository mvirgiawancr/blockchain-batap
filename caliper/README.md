# AkreChain Caliper TPS Benchmark

Hyperledger Caliper benchmark untuk mengukur TPS (Transactions Per Second) pada jaringan blockchain AkreChain.

## Prasyarat

1. **Docker & Docker Compose** - Pastikan sudah terinstall
2. **Node.js 18+** - Untuk menjalankan Caliper
3. **Jaringan Fabric** - Jaringan harus berjalan dengan chaincode ter-deploy

## Struktur Direktori

```
caliper/
├── package.json                         # Dependencies
├── networks/
│   ├── networkConfig.yaml               # Caliper network config
│   └── connection-profile.yaml          # Fabric connection profile
├── benchmarks/
│   ├── config.yaml                      # Full benchmark (write + read)
│   ├── config-write-only.yaml           # Write-only benchmark
│   ├── config-read-only.yaml            # Read-only benchmark
│   └── workload/
│       ├── createSubmission.js          # Write workload
│       ├── querySubmission.js           # Query single workload
│       └── queryAllSubmissions.js       # Query all workload
├── scripts/
│   └── run-benchmark.sh                 # Helper script
└── reports/                             # Generated reports
```

## Quick Start

### 1. Pastikan Jaringan Fabric Berjalan

```bash
cd /home/virgi/blockchain-new
./fablo-target/fabric-docker.sh up
```

### 2. Install Dependencies

```bash
cd caliper
npm install
npx caliper bind --caliper-bind-sut fabric:2.5
```

### 3. Jalankan Benchmark

**Menggunakan Helper Script:**

```bash
# Full benchmark (write + read)
./scripts/run-benchmark.sh all

# Write-only benchmark
./scripts/run-benchmark.sh write

# Read-only benchmark
./scripts/run-benchmark.sh read
```

**Atau manual dengan npx:**

```bash
npx caliper launch manager \
  --caliper-workspace . \
  --caliper-networkconfig networks/networkConfig.yaml \
  --caliper-benchconfig benchmarks/config.yaml \
  --caliper-flow-only-test
```

## Benchmark Rounds

### Full Benchmark (`config.yaml`)

| Round | Operation | Transactions | TPS Rate |
|-------|-----------|-------------|----------|
| 1 | CreateSubmission | 100 | 10 TPS |
| 2 | QuerySubmission | 200 | 50 TPS |
| 3 | QueryAllSubmissions | 100 | 20 TPS |

### Write-Only Benchmark (`config-write-only.yaml`)

| Round | Load | Transactions | TPS Rate |
|-------|------|-------------|----------|
| 1 | Light | 50 | 5 TPS |
| 2 | Medium | 100 | 15 TPS |
| 3 | Heavy | 200 | 30 TPS |

### Read-Only Benchmark (`config-read-only.yaml`)

| Round | Operation | Transactions | TPS Rate |
|-------|-----------|-------------|----------|
| 1 | Query Single (Light) | 100 | 50 TPS |
| 2 | Query Single (Heavy) | 300 | 100 TPS |
| 3 | Query All (Light) | 50 | 10 TPS |
| 4 | Query All (Heavy) | 100 | 30 TPS |

## Output Metrics

Caliper akan menghasilkan laporan dengan metrik berikut:

- **Throughput (TPS)**: Actual transactions per second
- **Latency**: Min, max, average latency (ms)
- **Success Rate**: Percentage of successful transactions
- **Resource Utilization**: CPU/Memory usage (jika monitor aktif)

## Reports

Laporan HTML akan disimpan di folder `reports/` dengan timestamp:
- `reports/full_benchmark_YYYYMMDD_HHMMSS.html`
- `reports/write_benchmark_YYYYMMDD_HHMMSS.html`
- `reports/read_benchmark_YYYYMMDD_HHMMSS.html`

## Customizing Benchmarks

Untuk menyesuaikan benchmark:

1. **Ubah jumlah transaksi**: Edit `txNumber` di config YAML
2. **Ubah TPS rate**: Edit `opts.tps` di `rateControl`
3. **Ubah jumlah workers**: Edit `workers.number` (default: 5)

Contoh untuk stress test dengan load tinggi:

```yaml
rounds:
  - label: stress-test
    txNumber: 1000
    rateControl:
      type: fixed-rate
      opts:
        tps: 100
```

## Troubleshooting

### Error: Network not running
Pastikan jaringan Fabric sudah berjalan:
```bash
docker ps | grep peer0.upps
```

### Error: Chaincode not found
Pastikan chaincode `submission-contract` sudah ter-deploy:
```bash
docker exec -it cli.upps.akreditasi.local peer chaincode list --channelID akreditasi --installed
```

### Error: Identity not found
Pastikan path ke sertifikat dan private key sudah benar di `networkConfig.yaml`
