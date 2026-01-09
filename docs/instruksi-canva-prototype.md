# Instruksi Pembuatan Diagram Prototype LAM-TEK di Canva

## Referensi Visual
- **Alur Kerja**: `docs/prototype_diagram-2.png`
- **Arsitektur**: `docs/prototype_diagram-3.png`

---

## DIAGRAM 1: ALUR KERJA PROTOTIPE

### Setup Awal
1. Buka Canva → Create Design → Custom Size → **1920 x 1080 px** (landscape)
2. Background: **Putih (#FFFFFF)**

### Struktur Layout
- Judul di atas
- 5 baris fase, masing-masing berisi flow boxes dengan panah

### Komponen yang Dibuat

#### A. Judul
- Text: **"ALUR KERJA PROTOTIPE"**
- Font: Poppins Bold, 48pt, Warna: #1e3a5f
- Subtitle: "Sistem Akreditasi Program Studi LAM-TEK 2025"
- Font: Poppins SemiBold, 24pt, Warna: #2563eb

#### B. Flow Boxes (Gunakan Rectangle dengan Round Corners)

| Aktor | Warna Gradient | Hex Code |
|-------|----------------|----------|
| UPPS | Biru | #3b82f6 → #2563eb |
| Sekretariat | Ungu | #8b5cf6 → #7c3aed |
| AI Gemini | Cyan | #06b6d4 → #0891b2 |
| KEA | Hijau | #22c55e → #16a34a |
| Asesor | Orange | #f59e0b → #d97706 |
| Majelis | Merah | #ef4444 → #dc2626 |
| Blockchain | Abu-abu | #374151 → #1f2937 |

#### C. Setiap Flow Box
- Size: 160 x 80 px
- Corner radius: 12px
- Text: Poppins SemiBold, 14pt, Putih
- Drop shadow: blur 15, opacity 20%

#### D. Panah Penghubung
- Gunakan "Arrow" dari Elements
- Warna: #64748b
- Ketebalan: 3px

### Konten Per Fase

**FASE 1: INPUT & VERIFIKASI**
```
[UPPS Upload LED/LKPS] → [Sekretariat Verifikasi] → [AI Gemini Scoring] → [Record Blockchain]
```

**FASE 2: PENUGASAN ASESOR**
```
[KEA Lihat Rekomendasi AI] → [KEA Tawarkan Asesor] → [Asesor Terima/Tolak] → [UPPS Konfirmasi] → [Record Blockchain]
```

**FASE 3: ASESMEN KECUKUPAN & PENJADWALAN**
```
PARALEL:
- Alur 3A: [Asesor Input AK] → [KEA Cek Konsistensi]
- Alur 3B: [KEA Usulkan Jadwal] → [Sekretariat Approve]
→ [Sinkronisasi & Record]
```

**FASE 4: ASESMEN LAPANGAN**
```
[Asesor Pelaksanaan AL] → [Input Nilai 7 Kriteria] → [KEA Review] → [Record Blockchain]
```

**FASE 5: KEPUTUSAN**
```
[Majelis Review] → [Sekretariat Terbitkan SK] → [UPPS Terima Hasil] → [Record Final Blockchain]
```

### Legend (di bawah diagram)
- Buat 7 kotak kecil dengan warna masing-masing aktor
- Tambahkan label di samping setiap warna

---

## DIAGRAM 2: ARSITEKTUR PROTOTIPE

### Setup Awal
1. Buka Canva → Custom Size → **1920 x 1080 px**
2. Background: **Putih (#FFFFFF)**

### Struktur Layout
4 layer horizontal dengan komponen di dalamnya, terhubung panah vertikal

### Komponen Layer

#### Layer 1: FRONTEND (Biru Muda)
- Background: Gradient #dbeafe → #bfdbfe
- Border: 3px solid #3b82f6
- Label: "FRONTEND LAYER (React.js)" - Background #3b82f6, text putih

**Komponen dalam box putih:**
| Icon | Nama | Deskripsi |
|------|------|-----------|
| 🏢 | UPPS Dashboard | Upload & Monitor |
| 🏛️ | Sekretariat Dashboard | Verifikasi & Admin |
| 📋 | KEA Dashboard | Koordinasi Asesor |
| 👤 | Asesor Dashboard | Input Penilaian |
| ⚖️ | Majelis Dashboard | Keputusan Final |

#### Layer 2: BACKEND (Hijau Muda)
- Background: Gradient #dcfce7 → #bbf7d0
- Border: 3px solid #22c55e
- Label: "BACKEND LAYER (Express.js)"

**Komponen:**
| Icon | Nama | Deskripsi |
|------|------|-----------|
| 🔐 | Auth Controller | JWT Authentication |
| 📤 | Upload Controller | LED/LKPS Handler |
| 📊 | Submission Controller | CRUD Operations |
| 👥 | Assessor Controller | Assignment Logic |
| 📅 | Schedule Controller | AL Scheduling |
| 🔔 | Notification | Real-time Updates |

#### Layer 3: SERVICES (Ungu Muda)
- Background: Gradient #f3e8ff → #e9d5ff
- Border: 3px solid #a855f7
- Label: "SERVICES LAYER"

**Komponen:**
| Icon | Nama | Deskripsi |
|------|------|-----------|
| 🤖 | Gemini AI Service | Document Scoring |
| 📊 | LAM-TEK Scoring | 7 Kriteria Calculator |
| 🔍 | Assessor Profiler | AI Matching |
| ⛓️ | Fabric Gateway | Blockchain SDK |
| 📁 | Pinata Service | IPFS Storage |

#### Layer 4: DATA (Orange Muda)
- Background: Gradient #ffedd5 → #fed7aa
- Border: 3px solid #f97316
- Label: "DATA LAYER"

**Komponen (lebih besar):**
| Icon | Nama | Deskripsi |
|------|------|-----------|
| ⛓️ | Hyperledger Fabric | Immutable Records, Smart Contracts |
| 🐘 | PostgreSQL | Users, Sessions, Metadata |
| 🌐 | IPFS (Pinata) | Document Storage |

### Connector Arrows
Di antara setiap layer, tambahkan:
- Panah vertikal besar
- Label capsule: "REST API", "Services Integration", "Data Persistence"

---

## TIPS CANVA

### Shortcut Berguna
- `R` - Rectangle
- `T` - Text
- `L` - Line
- `Ctrl+D` - Duplicate
- `Ctrl+G` - Group

### Template Elements
1. Buat 1 flow box, duplicate untuk sisanya
2. Buat 1 component box, duplicate untuk sisanya
3. Group setiap layer setelah selesai

### Export
- Format: **PNG** (300 DPI untuk cetak, 150 DPI untuk digital)
- Atau **PDF** untuk dokumentasi

---

## CHECKLIST

- [ ] Diagram Alur Kerja Prototipe
  - [ ] Judul
  - [ ] Fase 1-5 dengan flow boxes
  - [ ] Panah penghubung
  - [ ] Legend warna
  
- [ ] Diagram Arsitektur Prototipe
  - [ ] Layer Frontend
  - [ ] Layer Backend
  - [ ] Layer Services
  - [ ] Layer Data
  - [ ] Connector arrows
  - [ ] Legend
