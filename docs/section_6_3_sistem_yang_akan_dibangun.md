# 6.3 Sistem yang Akan Dibangun

Berdasarkan analisis permasalahan dan arsitektur yang telah dirancang, sistem akreditasi berbasis blockchain yang terintegrasi dengan Artificial Intelligence dikembangkan menggunakan arsitektur terdistribusi dengan komponen-komponen utama sebagai berikut:

## 6.3.1 Smart Contract (Chaincode)

Smart contract merupakan inti dari otomasi proses akreditasi yang dikembangkan menggunakan TypeScript dan di-deploy pada jaringan Hyperledger Fabric. Chaincode ini menangani seluruh siklus hidup pengajuan akreditasi dengan fungsi-fungsi utama:

| **Kategori** | **Fungsi** | **Keterangan** |
|--------------|-----------|----------------|
| Submission Management | `CreateSubmission` | Membuat pengajuan akreditasi baru dengan metadata program studi |
| | `UpdateDocuments` | Memperbarui dokumen LED-PS dan LKPS dengan pencatatan versi |
| | `QuerySubmission` | Query data submission berdasarkan ID |
| | `QueryAllSubmissions` | Query seluruh submission dalam ledger |
| | `GetSubmissionHistory` | Mendapatkan riwayat perubahan submission |
| AI Integration | `AttachAIRecommendation` | Menyimpan hasil analisis AI dan skor awal pada blockchain |
| | `SetScoringResult` | Menyimpan hasil penilaian LAM-TEK 2025 |
| Assessor Workflow | `OfferAssessorPair` | Mengajukan pasangan asesor untuk submission |
| | `RespondToOffer` | Response asesor terhadap penawaran tugas |
| | `UPPSRespondToOffer` | Response UPPS terhadap penugasan asesor |
| | `AssignAssessor` | Penugasan asesor secara resmi |
| Assessment Process | `SubmitAKAssessment` | Submit hasil Asesmen Kecukupan oleh asesor |
| | `CheckAKConsistency` | Pemeriksaan konsistensi antar asesor |
| | `ProposeALSchedule` | Pengajuan jadwal Asesmen Lapangan |
| | `ApproveALSchedule` | Persetujuan jadwal AL oleh sekretariat |
| Decision Making | `SetDecision` | Penetapan keputusan akhir akreditasi |
| | `CheckFlowsSynchronized` | Sinkronisasi Flow A (AK) dan Flow B (AL) |

## 6.3.2 Backend Application

Backend aplikasi dikembangkan menggunakan Express.js dengan arsitektur modular yang terdiri dari:

### a. Services Layer
| **Service** | **Fungsi** |
|-------------|-----------|
| `fabricService` | Integrasi dengan Hyperledger Fabric untuk invoke dan query chaincode |
| `geminiService` | Integrasi Google Gemini AI untuk analisis dokumen dan scoring LAM-TEK 2025 |
| `lamtekScoringService` | Implementasi algoritma scoring berdasarkan 53 butir penilaian LAM-TEK |
| `pinataService` | Integrasi IPFS melalui Pinata untuk penyimpanan dokumen terenkripsi |
| `encryptionKeyService` | Manajemen kunci enkripsi AES-256-CBC untuk keamanan dokumen |
| `authService` | Autentikasi dan otorisasi pengguna dengan JWT |
| `semanticScholarService` | Pencarian profil penelitian asesor untuk matching expertise |
| `googleScholarService` | Integrasi Google Scholar untuk verifikasi publikasi asesor |
| `websocketService` | Real-time notification untuk status update |

### b. Controllers Layer
| **Controller** | **Fungsi** |
|----------------|-----------|
| `authController` | Registrasi dan login untuk semua role pengguna |
| `submissionController` | Pengelolaan pengajuan akreditasi |
| `uploadController` | Upload dan enkripsi dokumen LED-PS/LKPS ke IPFS |
| `scoringController` | Trigger analisis AI dan penyimpanan hasil scoring |
| `assessorController` | Pengelolaan data dan penugasan asesor |
| `keaController` | Workflow Ketua Evaluasi Akreditasi |
| `sekretariatController` | Workflow sekretariat untuk verifikasi dan administrasi |
| `alScheduleController` | Pengelolaan jadwal Asesmen Lapangan |
| `notificationController` | Sistem notifikasi untuk semua stakeholder |

### c. Middleware Layer
| **Middleware** | **Fungsi** |
|----------------|-----------|
| `authMiddleware` | Verifikasi JWT token dan role-based access control |
| `errorHandler` | Penanganan error secara terpusat |
| `uploadMiddleware` | Validasi dan handling file upload |

## 6.3.3 Frontend Application

Frontend dikembangkan menggunakan React.js dengan Vite sebagai build tool, menyediakan antarmuka pengguna untuk setiap role:

### a. UPPS (Unit Pengelola Program Studi)
| **Halaman** | **Fungsi** |
|-------------|-----------|
| `UPPSDashboard` | Dashboard utama dengan statistik submission dan progress |
| `SubmissionsPage` | Daftar dan status pengajuan akreditasi |
| `UPPSAssignmentsPage` | Konfirmasi penugasan asesor yang diajukan |

### b. Sekretariat
| **Halaman** | **Fungsi** |
|-------------|-----------|
| `SekretariatDashboard` | Dashboard monitoring seluruh submission |
| `SekretariatVerifyPage` | Verifikasi kelengkapan dokumen |
| `SekretariatPaymentPage` | Konfirmasi pembayaran akreditasi |
| `SekretariatALApprovalPage` | Persetujuan jadwal Asesmen Lapangan |
| `SekretariatReportsPage` | Laporan dan statistik akreditasi |

### c. KEA (Ketua Evaluasi Akreditasi)
| **Halaman** | **Fungsi** |
|-------------|-----------|
| `KEADashboard` | Dashboard dengan overview status evaluasi |
| `KEAAssignmentsPage` | Penugasan asesor dengan rekomendasi AI |
| `KEAMonitoringPage` | Monitoring progress asesmen |
| `KEAConsistencyPage` | Pemeriksaan konsistensi nilai antar asesor |
| `KEAALSchedulingPage` | Pengajuan jadwal Asesmen Lapangan |

### d. Asesor
| **Halaman** | **Fungsi** |
|-------------|-----------|
| `AsesorDashboard` | Dashboard tugas asesor |
| `AsesorAssignmentsPage` | Daftar tugas yang ditawarkan dan ditugaskan |
| `AsesorAssessmentPage` | Form penilaian 7 kriteria LAM-TEK 2025 |
| `AssessorsInfoPage` | Informasi profil dan expertise asesor |

## 6.3.4 Integrasi Artificial Intelligence

Sistem mengintegrasikan Google Gemini AI untuk mendukung proses akreditasi dengan kemampuan:

| **Fitur** | **Deskripsi** |
|-----------|--------------|
| Document Analysis | Ekstraksi teks dari PDF (LED-PS) dan Excel (LKPS) untuk analisis |
| Document Verification | Verifikasi kesesuaian jenis dokumen (LED atau LKPS) |
| LAM-TEK 2025 Scoring | Penilaian otomatis berdasarkan 53 butir indikator dengan bobot sesuai jenis program |
| Criterion Extraction | Ekstraksi data relevan untuk setiap kriteria (1-7) |
| Assessor Matching | Rekomendasi asesor berdasarkan kecocokan expertise dengan program studi |
| Completeness Check | Pengecekan kelengkapan dokumen dan identifikasi kekurangan |

## 6.3.5 Penyimpanan Data

Sistem menerapkan arsitektur penyimpanan hybrid dengan pembagian sebagai berikut:

### a. On-chain (Hyperledger Fabric)
- Metadata submission (program studi, institusi, status, version)
- Hash dokumen (SHA-256) untuk verifikasi integritas
- Hasil analisis dan scoring AI
- Penugasan dan response asesor
- Hasil Asesmen Kecukupan (AK)
- Jadwal Asesmen Lapangan (AL)
- Keputusan akhir akreditasi
- Audit trail seluruh transaksi

### b. Off-chain (PostgreSQL)
- Data pengguna (UPPS, sekretariat, KEA, asesor, majelis)
- Profil dan expertise asesor
- Publikasi dan research interest asesor
- Sesi dan token autentikasi
- Log aplikasi

### c. Distributed Storage (IPFS via Pinata)
- Dokumen LED-PS (terenkripsi AES-256-CBC)
- Dokumen LKPS (terenkripsi AES-256-CBC)
- Dokumen pendukung lainnya

## 6.3.6 Teknologi yang Digunakan

| **Kategori** | **Teknologi** | **Versi/Keterangan** |
|--------------|--------------|---------------------|
| Blockchain Platform | Hyperledger Fabric | Permissioned blockchain |
| Smart Contract | TypeScript | Fabric Contract API |
| Backend | Express.js | Node.js runtime |
| Frontend | React.js + Vite | Single Page Application |
| AI Service | Google Gemini | Multimodal AI model |
| Database | PostgreSQL | Relational database untuk off-chain |
| Distributed Storage | IPFS (Pinata) | Decentralized file storage |
| Encryption | AES-256-CBC | Enkripsi dokumen |
| Authentication | JWT | JSON Web Token |
| Container | Docker | Deployment dan orchestration |

## 6.3.7 Alur Kerja Sistem

Sistem mengotomasi alur kerja akreditasi LAM-TEK 2025 melalui tahapan berikut:

1. **Pengajuan (Submission)**
   - UPPS mengunggah dokumen LED-PS dan LKPS
   - Dokumen dienkripsi dan disimpan di IPFS
   - Metadata dan hash dicatat di blockchain

2. **Analisis AI**
   - Sistem mengekstrak konten dokumen
   - AI menganalisis berdasarkan 7 kriteria LAM-TEK 2025
   - Skor awal dan rekomendasi disimpan di blockchain

3. **Verifikasi Sekretariat**
   - Sekretariat memverifikasi kelengkapan administratif
   - Konfirmasi pembayaran dan status dokumen

4. **Penugasan Asesor**
   - KEA menerima rekomendasi asesor dari AI
   - Asesor menerima/menolak penawaran tugas
   - UPPS memberikan persetujuan penugasan

5. **Asesmen Kecukupan (AK)**
   - Dua asesor melakukan penilaian independen
   - Sistem memeriksa konsistensi nilai antar asesor
   - Hasil AK dicatat di blockchain

6. **Asesmen Lapangan (AL)**
   - KEA mengusulkan jadwal AL
   - Sekretariat menyetujui jadwal
   - Sinkronisasi Flow A (AK) dan Flow B (AL)

7. **Penetapan Keputusan**
   - Majelis menetapkan hasil akhir akreditasi
   - Keputusan dicatat secara permanen di blockchain
   - Notifikasi dikirim ke semua stakeholder
