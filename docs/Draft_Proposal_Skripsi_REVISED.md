# DRAFT PROPOSAL SKRIPSI

**SISTEM AKREDITASI BERBASIS BLOCKCHAIN DENGAN INTEGRASI ARTIFICIAL INTELLIGENCE UNTUK AUTOMATED ASSESSMENT**

*(Studi Kasus: Akreditasi LAM-TEK 2025)*

---

## BAB I  
## PENDAHULUAN

### 1.1 Latar Belakang

Akreditasi merupakan proses penting dalam menjamin kualitas pendidikan tinggi di Indonesia. Lembaga Akreditasi Mandiri Teknik (LAM-TEK) bertugas melakukan penilaian kelayakan program studi teknik untuk memastikan standar mutu yang telah ditetapkan terpenuhi. Namun, sistem akreditasi konvensional yang berlaku saat ini menghadapi berbagai tantangan signifikan yang menghambat efisiensi, transparansi, dan objektivitas proses akreditasi.

Permasalahan pertama adalah **proses verifikasi dan validasi dokumen yang memakan waktu lama dan rentan terhadap manipulasi data**. Dokumen akreditasi seperti Laporan Evaluasi Diri Program Studi (LED-PS) dan Laporan Kinerja Program Studi (LKPS) sering kali mengalami perubahan yang tidak terdokumentasi dengan baik, sehingga menimbulkan keraguan terhadap validitas data yang disampaikan oleh institusi. Ketiadaan sistem pencatatan yang immutable membuat audit trail menjadi sulit dilakukan, dan pihak-pihak yang tidak berwenang berpotensi melakukan perubahan data tanpa jejak yang jelas.

Permasalahan kedua adalah **kurangnya transparansi dalam proses penilaian yang dapat menimbulkan keraguan terhadap objektivitas hasil akreditasi**. Proses penilaian yang dilakukan oleh asesor saat ini tidak dapat diakses secara transparan oleh berbagai stakeholder. Institusi yang diakreditasi tidak memiliki visibilitas penuh terhadap proses assessment, sehingga menimbulkan pertanyaan tentang fairness dan akuntabilitas dalam pengambilan keputusan akreditasi. Selain itu, tidak adanya mekanisme consensus yang melibatkan berbagai pihak membuat keputusan akreditasi terkesan bersifat sentralistik.

Permasalahan ketiga adalah **beban administratif yang tinggi baik bagi institusi yang diakreditasi (UPPS) maupun asesor**. Proses submission dokumen sering kali dilakukan secara manual atau melalui sistem yang tidak terintegrasi, menyebabkan redundansi data dan inefisiensi waktu. Asesor harus membaca dan mengevaluasi ratusan halaman dokumen secara manual untuk setiap submission, yang memerlukan waktu dan tenaga yang sangat besar. Hal ini mengakibatkan proses akreditasi menjadi lambat dan memakan biaya operasional yang tinggi.

Permasalahan keempat adalah **inkonsistensi penilaian antar asesor yang dapat mempengaruhi keadilan hasil akreditasi**. Setiap asesor memiliki interpretasi dan standar penilaian yang berbeda-beda terhadap kriteria akreditasi yang sama. Perbedaan ini dapat menyebabkan program studi dengan kualitas yang setara mendapatkan nilai akreditasi yang berbeda, bergantung pada asesor yang ditugaskan. Kebutuhan akan standardisasi dan consistency dalam assessment sangat diperlukan untuk menjaga fairness dan kredibilitas hasil akreditasi.

Permasalahan kelima adalah **kesulitan dalam pencocokan asesor yang tepat dengan submission berdasarkan expertise dan research area**. Saat ini, proses assignment asesor dilakukan secara manual tanpa adanya sistem rekomendasi yang intelligent. Hal ini berisiko menghasilkan assignment yang kurang optimal, di mana asesor yang ditugaskan mungkin tidak memiliki keahlian yang sesuai dengan bidang program studi yang dinilai, sehingga mengurangi kualitas assessment.

Di era transformasi digital dan Industry 4.0, teknologi blockchain dan artificial intelligence (AI) menawarkan solusi inovatif untuk mengatasi permasalahan-permasalahan tersebut. **Blockchain**, khususnya **Hyperledger Fabric**, dengan karakteristik desentralisasi, immutability, dan transparansi, dapat memastikan integritas data akreditasi dan mencegah manipulasi dokumen. Setiap transaksi dalam blockchain tercatat secara permanen dan dapat diaudit oleh semua participant yang berwenang, sehingga meningkatkan trustworth process. Sementara itu, **Artificial Intelligence** dengan kemampuan Natural Language Processing (NLP) dan machine learning dapat dimanfaatkan untuk melakukan automated assessment yang konsisten, objektif, dan efisien dalam mengevaluasi dokumen-dokumen akreditasi, serta memberikan rekomendasi asesor yang tepat berdasarkan kecocokan expertise.

Penelitian ini mengembangkan sistem akreditasi berbasis blockchain yang terintegrasi dengan teknologi AI untuk automated assessment pada konteks akreditasi LAM-TEK 2025 dengan 7 kriteria penilaian. Sistem yang dibangun memanfaatkan **Hyperledger Fabric** sebagai platform blockchain untuk menjamin immutability dan transparency data submission, **smart contract (chaincode)** untuk mengotomasi workflow akreditasi mulai dari submission, assignment, assessment, hingga decision making, **Pinata IPFS** untuk penyimpanan dokumen terdesentralisasi dengan encryption AES-256-CBC, **Google Gemini AI** untuk analisis dokumen dan automated scoring, serta **PostgreSQL** untuk menyimpan data off-chain seperti encryption keys dan user profiles.

Sistem ini mengimplementasikan **7 Kriteria LAM-TEK 2025** yang meliputi: (1) Diferensiasi Misi (DM), (2) Akuntabilitas (AK), (3) Relevansi Pendidikan, Penelitian, dan PkM (REL), (4) Sumber Daya Manusia (SDM), (5) Sarana, Prasarana, dan K3L (SARPRAS), (6) Mahasiswa dan Luaran (MHS), dan (7) Sistem Penjaminan Mutu (SPM). Dengan integrasi blockchain dan AI ini, diharapkan dapat tercapai sistem akreditasi yang lebih transparan, efisien, akurat, terpercaya, dan fair bagi semua stakeholder yang terlibat.

### 1.2 Identifikasi Masalah

Berdasarkan latar belakang yang telah diuraikan, maka identifikasi masalah dalam penelitian ini adalah:

1. Bagaimana merancang arsitektur sistem akreditasi berbasis blockchain menggunakan Hyperledger Fabric yang dapat menjamin integritas, immutability, dan transparansi data submission akreditasi LAM-TEK?

2. Bagaimana mengintegrasikan Google Gemini AI untuk melakukan automated assessment terhadap dokumen akreditasi (LED-PS dan LKPS) sesuai dengan 7 kriteria LAM-TEK 2025?

3. Bagaimana mengimplementasikan smart contract (chaincode) untuk mengotomasi workflow akreditasi mulai dari submission, AI recommendation, assessor assignment, assessment, hingga final decision dengan melibatkan multiple organizations (UPPS, Sekretariat, KEA, Asesor, Majelis)?

4. Bagaimana mengintegrasikan Pinata IPFS dengan enkripsi AES-256-CBC untuk penyimpanan dokumen akreditasi secara terdesentralisasi dan aman?

5. Bagaimana membangun sistem AI recommendation untuk mencocokkan asesor yang tepat dengan submission berdasarkan research area dan expertise menggunakan profiling data asesor real dari Google Scholar dan Scopus?

6. Bagaimana mengevaluasi kinerja, keakuratan assessment AI, dan keamanan sistem akreditasi berbasis blockchain dengan integrasi AI yang telah dibangun?

### 1.3 Batasan Masalah

Agar penelitian ini lebih terfokus dan terarah, maka ditetapkan batasan masalah sebagai berikut:

1. Sistem yang dikembangkan difokuskan untuk proses akreditasi program studi teknik menggunakan **7 Kriteria LAM-TEK 2025**: Diferensiasi Misi (DM), Akuntabilitas (AK), Relevansi Pendidikan-Penelitian-PkM (REL), SDM, Sarana-Prasarana-K3L, Mahasiswa-Luaran, dan Sistem Penjaminan Mutu (SPM)

2. Blockchain yang digunakan adalah **Hyperledger Fabric versi 2.5.12** dengan **6 organizations**: UPPS, Sekadmin, Sekkeu, KEA, Asesor, dan Majelis

3. Smart contract (chaincode) diimplementasikan menggunakan **TypeScript** dengan **fabric-contract-api**

4. AI service menggunakan **Google Gemini 1.5 Flash** untuk document analysis, automated scoring berdasarkan **formula 3D interpolation LAM-TEK**, dan assessor recommendation

5. Storage menggunakan **Pinata IPFS** untuk decentralized storage dengan enkripsi **AES-256-CBC** untuk keamanan dokumen

6. Backend dibangun dengan **Node.js dan Express.js**, menggunakan **PostgreSQL** untuk menyimpan encryption keys, user credentials (dengan bcrypt), dan off-chain metadata

7. Frontend dibangun dengan **React.js dan Vite**, menggunakan **Tailwind CSS** untuk styling

8. Sistem mencakup 4 role pengguna: **UPPS** (institusi pengaju), **Sekretariat/KEA** (admin dan assignment), **Asesor** (penilai), dan **Majelis** (decision maker)

9. Automated assessment AI fokus pada analisis dokumen LED-PS dan LKPS, scoring calculation berdasarkan formula LAM-TEK 2025, dan consistency checking

10. Assessor profiling menggunakan data real dari **34 dosen Teknologi Industri Pertanian IPB** dengan integrasi link Google Scholar dan Scopus untuk AI recommendation

11. Pengujian sistem dilakukan dalam lingkungan **development/local** menggunakan Docker untuk Hyperledger Fabric network

12. Evaluasi sistem menggunakan metode **functionality testing, AI accuracy testing (precision, recall, F1-score)**, dan **security testing** untuk blockchain dan encryption

### 1.4 Tujuan Penelitian

Tujuan dari penelitian ini adalah:

1. Merancang dan mengimplementasikan arsitektur sistem akreditasi berbasis Hyperledger Fabric yang menjamin integritas, immutability, dan transparansi data submission akreditasi LAM-TEK

2. Mengintegrasikan Google Gemini AI untuk melakukan automated assessment terhadap dokumen akreditasi (LED-PS dan LKPS) berdasarkan 7 kriteria LAM-TEK 2025 secara konsisten dan objektif

3. Mengimplementasikan smart contract (chaincode) untuk mengotomasi workflow akreditasi dari submission hingga final decision dengan melibatkan consensus antar organizations

4. Mengintegrasikan Pinata IPFS dengan enkripsi AES-256-CBC untuk penyimpanan dokumen akreditasi yang aman dan terdesentralisasi

5. Membangun sistem AI recommendation untuk matching asesor dengan submission berdasarkan research expertise menggunakan assessor profiling

6. Mengevaluasi kinerja sistem dari segi fungsionalitas, keamanan blockchain dan enkripsi, serta akurasi penilaian automated assessment AI

### 1.5 Manfaat Penelitian

Manfaat yang diharapkan dari penelitian ini adalah:

#### 1.5.1 Manfaat Teoritis
1. Memberikan kontribusi terhadap pengembangan ilmu pengetahuan di bidang blockchain (khususnya Hyperledger Fabric) dan artificial intelligence, khususnya dalam penerapannya pada sistem penjaminan mutu pendidikan tinggi
2. Menjadi referensi bagi penelitian selanjutnya terkait implementasi permissioned blockchain dan AI dalam sistem akreditasi atau quality assurance dengan multi-stakeholder involvement

#### 1.5.2 Manfaat Praktis
1. **Bagi Institusi Pendidikan (UPPS)**: Mempermudah proses submission dokumen akreditasi dengan sistem yang transparan, efisien, dan memberikan initial AI scoring sebagai self-assessment
2. **Bagi Asesor**: Membantu proses assessment dengan automated initial scoring yang konsisten, mengurangi beban administratif, dan mendapatkan assignment yang sesuai dengan expertise
3. **Bagi Sekretariat/KEA**: Menyediakan sistem AI recommendation untuk optimal assessor assignment dan dashboard monitoring submission secara real-time
4. **Bagi Stakeholder (LAM-TEK)**: Meningkatkan kepercayaan terhadap hasil akreditasi melalui transparansi blockchain, immutability data, dan consistency dalam assessment
5. **Bagi Pengembang Sistem**: Memberikan blueprint arsitektur sistem blockchain-AI yang dapat diadaptasi untuk domain akreditasi atau quality assurance lainnya

---

## BAB II  
## TINJAUAN PUSTAKA

### 2.1 Sistem Akreditasi Perguruan Tinggi

#### 2.1.1 Definisi Akreditasi
Akreditasi adalah kegiatan penilaian kelayakan program studi dan perguruan tinggi oleh organisasi independen yang dilakukan secara berkala. Akreditasi bertujuan untuk menentukan kelayakan program studi berdasarkan kriteria yang telah ditetapkan dan memberikan jaminan bahwa program studi yang terakreditasi telah memenuhi standar mutu yang ditetapkan.

#### 2.1.2 LAM-TEK (Lembaga Akreditasi Mandiri Teknik)
LAM-TEK adalah lembaga akreditasi mandiri yang berwenang melakukan akreditasi untuk program studi di bidang teknik di Indonesia. LAM-TEK 2025 menggunakan sistem akreditasi dengan 7 kriteria penilaian yang lebih komprehensif dibandingkan sistem sebelumnya.

#### 2.1.3 7 Kriteria LAM-TEK 2025
LAM-TEK 2025 mengimplementasikan 7 kriteria penilaian:

| Kriteria | Kode | Deskripsi | Fokus Penilaian |
|----------|------|-----------|-----------------|
| 1. Diferensiasi Misi | DM | Keunikan dan kekhasan VMTS (Visi, Misi, Tujuan, Sasaran) | Keunikan program studi |
| 2. Akuntabilitas | AK | Tata pamong, BOP, DPD, Kerjasama | Governance dan finansial |
| 3. Relevansi Pendidikan, Penelitian, dan PkM | REL | Kurikulum dan pembelajaran | Kualitas akademik |
| 4. Sumber Daya Manusia | SDM | DTPS, publikasi, penelitian dosen | Kualitas dosen |
| 5. Sarana, Prasarana, dan K3L | SARPRAS | Fasilitas dan K3L | Infrastruktur |
| 6. Mahasiswa dan Luaran | MHS | RMD, prestasi, lulusan | Output mahasiswa |
| 7. Sistem Penjaminan Mutu | SPM | SPMI dan kepuasan | Quality assurance |

#### 2.1.4 Formula Scoring LAM-TEK 2025
LAM-TEK 2025 menggunakan formula 3D Interpolation untuk beberapa indikator:

```
Score = 3.75 × ((A+B+(C/2))-(A×B)-((A×C)/2)-((B×C)/2)+((A×B×C)/2))
```

Dengan kategori akreditasi:
- **Unggul**: ≥ 361
- **Baik Sekali**: 301-360
- **Baik**: 200-300
- **Tidak Terakreditasi**: < 200

#### 2.1.5 Dokumen Akreditasi
- **LED-PS (Laporan Evaluasi Diri Program Studi)**: Dokumen self-assessment institusi
- **LKPS (Laporan Kinerja Program Studi)**: Data kuantitatif kinerja program studi dalam format Excel

### 2.2 Blockchain dan Hyperledger Fabric

#### 2.2.1 Definisi Blockchain
Blockchain adalah teknologi distributed ledger yang mencatat transaksi secara terdesentralisasi dan aman. Data disimpan dalam blok-blok yang saling terhubung secara kriptografis, membentuk rantai (chain) yang immutable dan transparan.

#### 2.2.2 Hyperledger Fabric
Hyperledger Fabric adalah platform blockchain permissioned yang dikembangkan oleh Linux Foundation. Berbeda dengan public blockchain seperti Ethereum, Hyperledger Fabric dirancang untuk enterprise use case dengan karakteristik:

1. **Permissioned Network**: Hanya participant yang teridentifikasi yang dapat bergabung
2. **Modular Architecture**: Komponen seperti consensus, membership dapat dikustomisasi
3. **Channels**: Private communication antar subset organizations
4. **Chaincode (Smart Contract)**: Business logic yang dijalankan di blockchain
5. **Membership Service Provider (MSP)**: Mengelola identitas participant
6. **Ordering Service**: Mengelola consensus dan ordering transaksi

#### 2.2.3 Smart Contract (Chaincode)
Chaincode adalah program yang berjalan di Hyperledger Fabric dan mengeksekusi business logic. Dalam sistem ini, chaincode diimplementasikan dengan TypeScript menggunakan fabric-contract-api untuk mengatur submission lifecycle, assignment, assessment, dan decision making.

Functions dalam submission-contract:
- `CreateSubmission`: Membuat submission baru
- `AttachAIRecommendation`: Menambahkan AI assessment
- `OfferAssessorPair`: Menawarkan pair asesor  
- `RespondToOffer`: Respons asesor terhadap offer
- `UPPSRespondToOffer`: Respons UPPS terhadap offer
- `SubmitAKAssessment`: Submit assessment dari asesor
- `CheckAKConsistency`: Cek consistency assessment
- `SetDecision`: Penetapan keputusan final
- `UpdateDocuments`: Update dokumen submission
- `SetScoringResult`: Set hasil scoring
- Query functions untuk mengambil data submission

#### 2.2.4 Consensus Mechanism
Hyperledger Fabric menggunakan endorsement policy untuk consensus. Dalam sistem ini, policy yang digunakan adalah:
```
OR('UPPSMSP.member','SekadminMSP.member','SekkeuMSP.member','KEAMSP.member','AsesorMSP.member','MajelisMSP.member')
```

### 2.3 InterPlanetary File System (IPFS) dan Pinata

#### 2.3.1 IPFS (InterPlanetary File System)
IPFS adalah protokol peer-to-peer untuk penyimpanan dan berbagi data dalam sistem file terdistribusi. IPFS menggunakan content-addressing (CID - Content Identifier) untuk memastikan setiap file memiliki hash unik yang dapat diverifikasi.

#### 2.3.2 Pinata
Pinata adalah layanan cloud untuk mempermudah penggunaan IPFS tanpa perlu mengelola node sendiri. Pinata menyediakan:
- Upload API untuk menyimpan file ke IPFS
- Gateway untuk mengakses file dari IPFS
- Pinning service untuk memastikan file tetap tersedia

#### 2.3.3 Enkripsi AES-256-CBC
Sebelum di-upload ke IPFS, dokumen dienkripsi menggunakan AES-256-CBC (Advanced Encryption Standard dengan 256-bit key dan Cipher Block Chaining mode). Encryption key dan initialization vector (IV) disimpan di PostgreSQL untuk setiap dokumen, sehingga hanya pihak yang berwenang dapat mendekripsi dokumen.

### 2.4 Artificial Intelligence dan Natural Language Processing

#### 2.4.1 Definisi Artificial Intelligence
Artificial Intelligence adalah cabang ilmu komputer yang berfokus pada pembuatan sistem yang dapat melakukan tugas-tugas yang memerlukan kecerdasan manusia, seperti pemahaman bahasa, pengenalan pola, dan pengambilan keputusan.

#### 2.4.2 Natural Language Processing (NLP)
NLP adalah bidang AI yang fokus pada interaksi antara komputer dan bahasa manusia. NLP memungkinkan komputer untuk memahami, menginterpretasi, dan menghasilkan bahasa manusia dengan cara yang bermakna.

#### 2.4.3 Google Gemini AI
Google Gemini adalah model AI generatif multimodal yang dikembangkan oleh Google DeepMind. Gemini 1.5 Flash yang digunakan dalam sistem ini memiliki kemampuan:
- Text understanding dan generation
- Document analysis (PDF, Excel)
- Reasoning dan logic
- Context window yang sangat besar (up to 1M tokens)

#### 2.4.4 Aplikasi AI dalam Sistem
Dalam sistem akreditasi ini, Google Gemini AI digunakan untuk:

1. **Document Analysis**: Mengekstrak informasi dari LED-PS (PDF) dan LKPS (Excel)
2. **Automated Scoring**: Menghitung score berdasarkan 7 kriteria LAM-TEK menggunakan formula interpolation
3. **Consistency Checking**: Memeriksa konsistensi data antar dokumen
4. **Assessor Recommendation**: Mencocokkan submission dengan asesor berdasarkan research area menggunakan profiling data dari Google Scholar dan Scopus
5. **Quality Assessment**: Menilai kelengkapan dan kualitas dokumen

### 2.5 PostgreSQL Database

#### 2.5.1 Arsitektur Hybrid: On-chain dan Off-chain
Sistem menggunakan arsitektur hybrid di mana:
- **On-chain (Blockchain)**: Data submission, workflow state, AI scores, assessments
- **Off-chain (PostgreSQL)**: Encryption keys, user credentials, assessor profiles, audit logs

#### 2.5.2 Tabel-tabel dalam Database
1. **users**: User credentials dan profiles (UPPS, Sekretariat, Asesor, KEA)
2. **encryption_keys**: AES-256-CBC keys dan IV untuk setiap dokumen
3. **submission_assignments**: Assignment submission ke asesor
4. **assessor_profiles**: Profiling asesor dengan Google Scholar dan Scopus URLs
5. **audit_logs**: Detailed audit trail
6. **notifications**: User notifications
7. **sessions**: User session management

### 2.6 Tech Stack Sistem

#### 2.6.1 Backend (Express.js)
- **Framework**: Express.js 4.18.2
- **Language**: JavaScript (Node.js >= 18.0.0)
- **Blockchain Integration**: fabric-network, fabric-ca-client
- **AI Integration**: @google/generative-ai
- **IPFS Integration**: Pinata SDK
- **Database**: pg (PostgreSQL client)
- **Security**: bcrypt, jsonwebtoken, helmet, express-rate-limit
- **Validation**: joi, express-validator
- **Logging**: winston, morgan

#### 2.6.2 Frontend (React.js)
- **Framework**: React 18.2.0
- **Build Tool**: Vite  
- **Routing**: react-router-dom
- **Styling**: Tailwind CSS 4.0
- **HTTP Client**: axios
- **Icons**: lucide-react

#### 2.6.3 Blockchain Infrastructure
- **Platform**: Hyperledger Fabric 2.5.12
- **Deployment**: Fablo (Fabric blockchain orchestrator)
- **Organizations**: 6 organizations (UPPS, Sekadmin, Sekkeu, KEA, Asesor, Majelis)
- **Channel**: akreditasi
- **Chaincode**: submission-contract (TypeScript)
- **Database**: CouchDB untuk world state

### 2.7 Penelitian Terkait

[Tabel ini akan diisi dengan 7-10 penelitian relevan tentang blockchain dalam pendidikan, AI untuk assessment, dan Hyperledger Fabric implementations]

| No | Judul | Penulis & Tahun | Hasil | Persamaan & Perbedaan |
|----|-------|-----------------|-------|----------------------|
| 1. | Blockchain-Based Academic Certificate Verification | [Author], 2023 | Menggunakan blockchain untuk verifikasi kredensial | Persamaan: Blockchain untuk pendidikan. Perbedaan: Fokus pada sertifikat, bukan akreditasi |
| 2. | AI-Powered Automated Assessment System | [Author], 2024 | AI untuk automated scoring | Persamaan: AI assessment. Perbedaan: Tidak terintegrasi blockchain |
| 3. | Hyperledger Fabric for Supply Chain | [Author], 2023 | Implementasi HLF untuk traceability | Persamaan: Hyperledger Fabric. Perbedaan: Domain berbeda |

---

## BAB III  
## METODOLOGI PENELITIAN

### 3.1 Metode Penelitian

Penelitian ini menggunakan metode Research and Development (R&D) dengan pendekatan kuantitatif dan kualitatif. Metode ini dipilih karena bertujuan untuk menghasilkan produk berupa sistem akreditasi berbasis blockchain dengan integrasi AI, serta menguji efektivitas produk tersebut.

### 3.2 Tahapan Penelitian

#### 3.2.1 Studi Literatur
Mengumpulkan dan mempelajari literatur terkait:
- Sistem akreditasi LAM-TEK 2025 dengan 7 kriteria
- Formula scoring dan interpolation LAM-TEK
- Hyperledger Fabric architecture dan chaincode development
- Google Gemini AI dan capabilities
- IPFS dan Pinata untuk decentralized storage
- Enkripsi AES-256-CBC untuk document security
- PostgreSQL untuk hybrid architecture
- Penelitian terkait blockchain dalam pendidikan dan AI assessment

#### 3.2.2 Analisis Kebutuhan
Melakukan analisis terhadap:
- Kebutuhan fungsional sistem berdasarkan 7 kriteria LAM-TEK
- Kebutuhan non-fungsional (keamanan, performa, immutability)
- Identifikasi 6 organizations dan roles (UPPS, Sekadmin, Sekkeu, KEA, Asesor, Majelis)
- Workflow proses akreditasi dari submission hingga decision
- Jenis dokumen (LED-PS PDF, LKPS Excel) dan kebutuhan AI analysis
- Kebutuhan assessor profiling untuk AI recommendation

#### 3.2.3 Perancangan Sistem

Sistem yang dirancang mengacu pada implementasi existing:

##### A. Arsitektur Blockchain
- **Platform**: Hyperledger Fabric 2.5.12
- **Organizations**: 6 organizations dengan masing-masing peer
- **Channel**: akreditasi (single channel untuk semua organizations)
- **Chaincode**: submission-contract (TypeScript) dengan 20+ functions
- **Endorsement Policy**: OR policy untuk flexibility
- **Database**: CouchDB untuk world state storage

##### B. Arsitektur Backend
- **Framework**: Express.js dengan Node.js
- **Services**:
  - fabricService.js: Blockchain interaction
  - geminiService.js: AI analysis dan scoring
  - pinataService.js: IPFS upload/download
  - lamtekScoringService.js: LAM-TEK scoring calculations
  - authService.js: Authentication dan authorization
  - encryptionKeyService.js: Enkripsi/dekripsi management
- **Controllers**: Upload, Submission, Scoring, Assessor, KEA, Sekretariat
- **Middleware**: Auth, validation, file upload, error handling
- **Database**: PostgreSQL dengan 8 tables

##### C. Arsitektur Frontend
- **Framework**: React.js dengan Vite
- **Pages**: Dashboard untuk UPPS, Asesor, KEA, Sekretariat
- **Features**:
  - Upload LED-PS dan LKPS
  - View AI recommendations
  - View/manage assignments
  - Submit assessments
  - View blockchain history

##### D. AI Model Design
- **Model**: Google Gemini 1.5 Flash
- **Input**: LED-PS (PDF) dan LKPS (Excel)
- **Processing**:
  - PDF extraction menggunakan pdf-parse
  - Excel extraction menggunakan exceljs
  - Prompt engineering untuk setiap kriteria LAM-TEK
- **Output**:
  - Score per kriteria (1-7)
  - Total score dan kategori akreditasi
  - Assessor recommendations
  - Consistency notes

##### E. Security Design
- **Document Encryption**: AES-256-CBC untuk file sebelum upload ke IPFS
- **User Authentication**: bcrypt untuk password hashing, JWT untuk session
- **MSP Credentials**: Encrypted storage di PostgreSQL
- **API Security**: Helmet, CORS, rate limiting
- **Input Validation**: Joi schemas untuk semua endpoints

#### 3.2.4 Implementasi

Implementasi mengikuti struktur existing:

##### A. Implementasi Blockchain (Hyperledger Fabric)
```bash
# Setup Fabric network dengan Fablo
fablo init
# Edit fablo-config.json (6 organizations, akreditasi channel)
fablo up
# Deploy chaincode
cd chaincode/submission-contract
npm install
npm run build
```

Chaincode functions yang diimplementasikan:
- CreateSubmission, AttachAIRecommendation
- OfferAssessorPair, RespondToOffer, UPPSRespondToOffer
- SubmitAKAssessment, CheckAKConsistency
- AssignAssessor, SetDecision, UpdateDocuments
- QuerySubmission, QueryAllSubmissions, GetSubmissionHistory

##### B. Implementasi AI Service
```javascript
// geminiService.js
- analyzeLEDPS(pdfBuffer): Ekstrak dan analisis LED-PS
- analyzeLKPS(excelBuffer): Ekstrak dan analisis LKPS  
- calculateScores(ledData, lkpsData): Hitung score 7 kriteria
- recommendAssessors(submission, assessorProfiles): AI matching
```

Menggunakan Google Gemini 1.5 Flash API dengan prompt engineering untuk setiap kriteria LAM-TEK.

##### C. Implementasi Backend
```bash
cd backend-express
npm install
cp .env.example .env
# Configure: GEMINI_API_KEY, PINATA_JWT, DB credentials
npm run dev
```

14 API endpoints diimplementasikan:
- POST /api/v1/upload: Upload LED + LKPS
- GET /api/v1/submissions: List submissions
- POST /api/v1/scoring/calculate: Calculate scores
- POST /api/v1/assessor/recommend: Get AI recommendations
- dll.

##### D. Implementasi Frontend
```bash
cd frontend
npm install
npm run dev
```

Pages yang diimplementasikan:
- Login, Dashboard (per role)
- Upload Document (UPPS)
- View Submissions (All roles)
- Assignment Management (KEA)
- Assessment Form (Asesor)

##### E. Database Setup
```bash
# PostgreSQL initialization
psql -U postgres
CREATE DATABASE akreditasi;
psql -U postgres -d akreditasi -f backend-express/init-db.sql
```

8 tables dengan 34 asesor real dari TIN IPB.

#### 3.2.5 Pengujian Sistem

##### A. Testing Blockchain
- Chaincode unit testing untuk setiap function
- Transaction flow testing untuk submission lifecycle
- Endorsement policy testing
- Query performance testing

##### B. Testing AI Model
- Accuracy testing dengan sample LED-PS dan LKPS
- Comparison AI score vs manual asesor score
- Precision, Recall, F1-score untuk assessor recommendation
- Response time testing

##### C. Testing Backend
- API endpoint testing (menggunakan test_api.sh script)
- Authentication dan authorization testing
- Encryption/decryption testing
- Database integration testing
- Error handling testing

##### D. Testing Frontend
- UI/UX functionality testing
- Role-based access testing  
- Form validation testing
- Responsive design testing

##### E. Security Testing
- Penetration testing untuk API
- Encryption strength testing
- Blockchain immutability testing
- Input validation testing

#### 3.2.6 Evaluasi dan Analisis
- Analisis hasil pengujian fungsionalitas (success rate API calls)
- Analisis akurasi AI assessment (comparison dengan asesor manual)
- Analisis performa sistem (response time, throughput)
- Analisis keamanan (encryption, blockchain immutability)
- Analisis efisiensi (time reduction dalam proses akreditasi)

### 3.3 Alat dan Bahan Penelitian

#### 3.3.1 Perangkat Keras
- Laptop/PC dengan spesifikasi:
  - Processor: Intel Core i5 atau setara
  - RAM: 16 GB (minimum untuk Fabric network)
  - Storage: 256 GB SSD
  - Internet connection yang stabil

#### 3.3.2 Perangkat Lunak

**Development Tools:**
- Visual Studio Code
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Docker dan Docker Compose
- PostgreSQL 15

**Blockchain:**
- Hyperledger Fabric 2.5.12
- Fablo 2.3.0 (Fabric orchestrator)
- fabric-network, fabric-ca-client
- CouchDB

**AI:**
- Google Gemini 1.5 Flash API
- @google/generative-ai SDK
- pdf-parse untuk PDF extraction
- exceljs untuk Excel processing

**Backend:**
- Express.js 4.18.2
- PostgreSQL client (pg)
- bcrypt, jsonwebtoken
- joi, express-validator
- helmet, cors, express-rate-limit
- winston, morgan
- multer untuk file upload

**Frontend:**
- React 18.2.0
- Vite build tool
- Tailwind CSS 4.0
- react-router-dom
- axios
- lucide-react

**Storage:**
- Pinata untuk IPFS
- Node crypto untuk AES-256-CBC encryption

#### 3.3.3 Data

**Data Real yang Digunakan:**
- 34 profil asesor dari Teknologi Industri Pertanian IPB
- Template LKPS LAM-TEK 2025 (format Excel)
- Matriks Penilaian LAM-TEK 2025 (PDF)
- Sample LED-PS dan LKPS untuk testing
- Formula scoring LAM-TEK dengan 3D interpolation

### 3.4 Model Pengembangan Perangkat Lunak

Penelitian ini menggunakan metode **Agile Scrum** sebagai model pengembangan, sebagaimana terlihat dari implementasi iteratif yang telah dilakukan:

**Alasan Pemilihan Agile:**
1. Fleksibel terhadap perubahan requirements
2. Development incremental dengan testing kontinyu
3. Feedback loops yang cepat
4. Kolaboratif dengan stakeholder

**Sprint yang Telah Dilakukan:**
- Sprint 1-2: Setup Fabric network, PostgreSQL, initial chaincode
- Sprint 3-4: Backend API development, Gemini integration
- Sprint 5-6: Frontend development, IPFS integration
- Sprint 7-8: Assessor profiling, AI recommendation
- Sprint 9-10: Testing, refinement, documentation

### 3.5 Jadwal Penelitian

| Kegiatan | Bulan 1 | Bulan 2 | Bulan 3 | Bulan 4 | Bulan 5 | Bulan 6 |
|----------|---------|---------|---------|---------|---------|---------|
| **Proposal** | | | | | | |
| - Penyusunan proposal | W1-2 | | | | | |
| - Revisi proposal | W3-4 | | | | | |
| **Studi Literatur & Analisis** | | | | | | |
| - Literatur LAM-TEK, Fabric, AI | | W1-4 | | | | |
| - Analisis requirements | | W3-4 | W1 | | | |
| **Perancangan** | | | | | | |
| - Arsitektur blockchain | | | W1-2 | | | |
| - Perancangan chaincode | | | W2-3 | | | |
| - Perancangan AI service | | | W3-4 | | | |
| - Perancangan database | | | W4 | W1 | | |
| **Implementasi** | | | | | | |
| - Setup Fabric network | | | | W1-2 | | |
| - Implementasi chaincode | | | | W2-3 | | |
| - Implementasi backend | | | | W3-4 | W1-2 | |
| - Implementasi AI service | | | | | W2-3 | |
| - Implementasi frontend | | | | | W3-4 | |
| **Testing & Evaluasi** | | | | | | |
| - Unit testing | | | | | W4 | W1-2 |
| - Integration testing | | | | | | W2-3 |
| - Evaluasi AI accuracy | | | | | | W3 |
| **Dokumentasi** | | | | | | |
| - Penulisan skripsi | | | | W4 | W4 | W1-4 |
| - Finalisasi | | | | | | W4 |

*Keterangan: W = Week*

**Tempat Penelitian:**
- Development dilakukan di laboratorium/rumah
- Testing menggunakan environment lokal dengan Docker
- Data asesor dari Departemen Teknologi Industri Pertanian IPB

### 3.6 Sistematika Penulisan

**BAB 1 PENDAHULUAN**  
Latar belakang, identifikasi masalah, batasan masalah, tujuan penelitian, manfaat penelitian, dan sistematika penulisan.

**BAB 2 TINJAUAN PUSTAKA**  
Teori tentang akreditasi LAM-TEK 2025, Hyperledger Fabric, chaincode, IPFS, Google Gemini AI, PostgreSQL, enkripsi AES-256-CBC, serta penelitian terkait.

**BAB 3 ANALISIS DAN PERANCANGAN SISTEM**  
Analisis requirements, perancangan arsitektur blockchain (6 organizations, chaincode), perancangan AI service (Gemini integration), perancangan database PostgreSQL, perancangan enkripsi, dan perancangan workflow submission-assessment-decision.

**BAB 4 IMPLEMENTASI DAN PENGUJIAN SISTEM**  
Implementasi Hyperledger Fabric network dengan Fablo, implementasi chaincode TypeScript, implementasi backend Express.js dengan 14 endpoints, implementasi AI service dengan Gemini, implementasi frontend React, implementasi IPFS dengan Pinata, hasil pengujian fungsionalitas, AI accuracy, dan security.

**BAB 5 KESIMPULAN DAN SARAN**  
Kesimpulan hasil penelitian, evaluasi keberhasilan sistem, keterbatasan, dan saran pengembangan future work.

---

## DAFTAR PUSTAKA

[1] LAM-TEK, "Instrumen Akreditasi LAM-TEK 2025 - 7 Kriteria," Lembaga Akreditasi Mandiri Teknik, 2025.

[2] Hyperledger Foundation, "Hyperledger Fabric Documentation," Linux Foundation, 2024. [Online]. Available: https://hyperledger-fabric.readthedocs.io/

[3] E. Androulaki et al., "Hyperledger Fabric: A Distributed Operating System for Permissioned Blockchains," in Proceedings of the Thirteenth EuroSys Conference (EuroSys '18), ACM, 2018.

[4] Google DeepMind, "Gemini: A Family of Highly Capable Multimodal Models," Google, 2024. [Online]. Available: https://deepmind.google/technologies/gemini/

[5] J. Benet, "IPFS - Content Addressed, Versioned, P2P File System," Protocol Labs, 2014.

[6] Pinata, "Pinata: The Easiest Way to Use IPFS," 2024. [Online]. Available: https://www.pinata.cloud/

[7] NIST, "Advanced Encryption Standard (AES)," FIPS PUB 197, National Institute of Standards and Technology, 2001.

[8] PostgreSQL Global Development Group, "PostgreSQL 15 Documentation," 2024. [Online]. Available: https://www.postgresql.org/docs/15/

[9] M. Turkanović, M. Hölbl, K. Košič, M. Heričko, and A. Kamišalić, "EduCTX: A Blockchain-Based Higher Education Credit Platform," IEEE Access, vol. 6, pp. 5112-5127, 2018.

[10] Q. Sun, K. Xia, and J. Zhang, "Application of Blockchain and Artificial Intelligence in Education," in Proceedings of ICAIE 2020, 2020.

[11] K. Salah, M. H. U. Rehman, N. Nizamuddin, and A. Al-Fuqaha, "Blockchain for AI: Review and Open Research Challenges," IEEE Access, vol. 7, pp. 10127-10149, 2019.

[12] A. Grech and A. F. Camilleri, "Blockchain in Education," European Commission JRC Science for Policy Report, 2017.

[13] F. Casino, T. K. Dasaklis, and C. Patsakis, "A systematic literature review of blockchain-based applications: Current status, classification and open issues," Telematics and Informatics, vol. 36, pp. 55-81, 2019.

[14] X. Zheng et al., "Blockchain challenges and opportunities: A survey," International Journal of Web and Grid Services, vol. 14, no. 4, pp. 352-375, 2018.

[15] S. Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System," 2008.

[16] V. Buterin, "Ethereum White Paper: A Next-Generation Smart Contract and Decentralized Application Platform," 2014.

[17] I. Goodfellow, Y. Bengio, and A. Courville, "Deep Learning," MIT Press, 2016.

[18] D. Jurafsky and J. H. Martin, "Speech and Language Processing," 3rd ed., 2023.

[19] T. Brown et al., "Language Models are Few-Shot Learners," in Advances in Neural Information Processing Systems 33 (NeurIPS 2020), 2020.

[20] R. Sharma, "Artificial Intelligence in Education: AI and the Future of Learning," International Journal of Advanced Research in Computer Science, vol. 10, no. 3, 2019.

[21] H. Aldowah, H. Al-Samarraie, and W. M. Fauzy, "Educational data mining and learning analytics for 21st century higher education: A review and synthesis," Telematics and Informatics, vol. 37, pp. 13-49, 2019.

[22] M. Hajian Berenjestanaki et al., "Blockchain-Based E-Voting Systems: A Technology Review," Electronics, vol. 13, no. 1, 2024.

[23] Y. Chen et al., "Blockchain-based Medical Records Secure Storage and Medical Service Framework," Journal of Medical Systems, vol. 43, no. 1, 2019.

[24] N. Kshetri and J. Voas, "Blockchain-Enabled E-Voting," IEEE Software, vol. 35, no. 4, pp. 95-99, 2018.

[25] M. A. Ferrag et al., "Blockchain Technologies for the Internet of Things: Research Issues and Challenges," IEEE Internet of Things Journal, vol. 6, no. 2, pp. 2188-2204, 2019.

---

**Catatan Revisi:**

✅ **Latar belakang diperpanjang dan lebih detail** - Menjelaskan 5 masalah utama dengan elaborasi
✅ **Identifikasi Masalah** - Diubah dari "Rumusan Masalah" ke "Identifikasi Masalah" dengan 6 poin masalah spesifik
✅ **Disesuaikan dengan sistem yang dibangun** - Semua teknologi, tools, dan implementasi mengacu pada folder project Anda:
   - Hyperledger Fabric 2.5.12 dengan 6 organizations
   - Chaincode TypeScript (submission-contract)
   - Google Gemini 1.5 Flash  
   - Pinata IPFS dengan AES-256-CBC
   - PostgreSQL dengan 8 tables
   - Express.js backend (14 endpoints)
   - React.js + Vite frontend
   - 34 asesor real dari TIN IPB
   - 7 Kriteria LAM-TEK 2025
   - Formula 3D interpolation

✅ **Tidak ngarang** - Semua detail teknis diambil dari:
   - backend-express/package.json
   - fablo-config.json
   - chaincode/submission-contract
   - init-db.sql
   - .env.example
   - README.md files
