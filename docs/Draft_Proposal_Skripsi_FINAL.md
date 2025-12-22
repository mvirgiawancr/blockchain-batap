# DRAFT PROPOSAL SKRIPSI

**SISTEM AKREDITASI BERBASIS BLOCKCHAIN DENGAN INTEGRASI ARTIFICIAL INTELLIGENCE UNTUK AUTOMATED ASSESSMENT**

*(Studi Kasus: Akreditasi LAM-TEK 2025)*

---

## BAB I  
## PENDAHULUAN

### 1.1 Latar Belakang

Akreditasi merupakan proses penting dalam menjamin kualitas pendidikan tinggi di Indonesia [1]. Lembaga Akreditasi Mandiri Teknik (LAM-TEK) bertugas melakukan penilaian kelayakan program studi teknik untuk memastikan standar mutu yang telah ditetapkan terpenuhi [1]. Namun, sistem akreditasi konvensional yang berlaku saat ini menghadapi berbagai tantangan signifikan yang menghambat efisiensi, transparansi, dan objektivitas proses akreditasi.

Permasalahan pertama adalah **proses verifikasi dan validasi dokumen yang memakan waktu lama dan rentan terhadap manipulasi data**. Dokumen akreditasi seperti Laporan Evaluasi Diri Program Studi (LED-PS) dan Laporan Kinerja Program Studi (LKPS) sering kali mengalami perubahan yang tidak terdokumentasi dengan baik, sehingga menimbulkan keraguan terhadap validitas data yang disampaikan oleh institusi [12]. Ketiadaan sistem pencatatan yang immutable membuat audit trail menjadi sulit dilakukan, dan pihak-pihak yang tidak berwenang berpotensi melakukan perubahan data tanpa jejak yang jelas.

Permasalahan kedua adalah **kurangnya transparansi dalam proses penilaian yang dapat menimbulkan keraguan terhadap objektivitas hasil akreditasi**. Proses penilaian yang dilakukan oleh asesor saat ini tidak dapat diakses secara transparan oleh berbagai stakeholder. Institusi yang diakreditasi tidak memiliki visibilitas penuh terhadap proses assessment, sehingga menimbulkan pertanyaan tentang fairness dan akuntabilitas dalam pengambilan keputusan akreditasi. Selain itu, tidak adanya mekanisme consensus yang melibatkan berbagai pihak membuat keputusan akreditasi terkesan bersifat sentralistik.

Permasalahan ketiga adalah **beban administratif yang tinggi baik bagi institusi yang diakreditasi (UPPS) maupun asesor**. Proses submission dokumen sering kali dilakukan secara manual atau melalui sistem yang tidak terintegrasi, menyebabkan redundansi data dan inefisiensi waktu. Asesor harus membaca dan mengevaluasi ratusan halaman dokumen secara manual untuk setiap submission, yang memerlukan waktu dan tenaga yang sangat besar. Hal ini mengakibatkan proses akreditasi menjadi lambat dan memakan biaya operasional yang tinggi.

Permasalahan keempat adalah **inkonsistensi penilaian antar asesor yang dapat mempengaruhi keadilan hasil akreditasi**. Setiap asesor memiliki interpretasi dan standar penilaian yang berbeda-beda terhadap kriteria akreditasi yang sama. Perbedaan ini dapat menyebabkan program studi dengan kualitas yang setara mendapatkan nilai akreditasi yang berbeda, bergantung pada asesor yang ditugaskan. Kebutuhan akan standardisasi dan consistency dalam assessment sangat diperlukan untuk menjaga fairness dan kredibilitas hasil akreditasi.

Permasalahan kelima adalah **kesulitan dalam pencocokan asesor yang tepat dengan submission berdasarkan expertise dan research area**. Saat ini, proses assignment asesor dilakukan secara manual tanpa adanya sistem rekomendasi yang intelligent. Hal ini berisiko menghasilkan assignment yang kurang optimal, di mana asesor yang ditugaskan mungkin tidak memiliki keahlian yang sesuai dengan bidang program studi yang dinilai, sehingga mengurangi kualitas assessment.

Di era transformasi digital dan Industry 4.0, teknologi blockchain dan artificial intelligence (AI) menawarkan solusi inovatif untuk mengatasi permasalahan-permasalahan tersebut. **Blockchain**, khususnya **Hyperledger Fabric**, dengan karakteristik desentralisasi, immutability, dan transparansi, dapat memastikan integritas data akreditasi dan mencegah manipulasi dokumen [2], [3]. Setiap transaksi dalam blockchain tercatat secara permanen dan dapat diaudit oleh semua participant yang berwenang, sehingga meningkatkan trustworthy process [13]. Sementara itu, **Artificial Intelligence** dengan kemampuan Natural Language Processing (NLP) dapat dimanfaatkan untuk melakukan automated assessment yang konsisten, objektif, dan efisien dalam mengevaluasi dokumen-dokumen akreditasi [6], [7], serta memberikan rekomendasi asesor yang tepat berdasarkan kecocokan expertise [15].

Penelitian ini mengembangkan sistem akreditasi berbasis blockchain yang terintegrasi dengan teknologi AI untuk automated assessment pada konteks akreditasi LAM-TEK 2025 dengan 7 kriteria penilaian [1]. Sistem yang dibangun memanfaatkan Hyperledger Fabric sebagai platform blockchain [3], smart contract untuk mengotomasi workflow akreditasi, IPFS untuk penyimpanan dokumen terdesentralisasi dengan enkripsi [4], [5], Google Gemini AI untuk analisis dokumen dan automated scoring [8], serta database untuk menyimpan data off-chain. Dengan integrasi blockchain dan AI ini, diharapkan dapat tercapai sistem akreditasi yang lebih transparan, efisien, akurat, terpercaya, dan fair bagi semua stakeholder yang terlibat [9], [10], [11].

### 1.2 Identifikasi Masalah

Berdasarkan latar belakang yang telah diuraikan, maka identifikasi masalah dalam penelitian ini adalah:

1. Bagaimana merancang arsitektur sistem akreditasi berbasis blockchain yang dapat menjamin integritas, immutability, dan transparansi data submission akreditasi LAM-TEK?

2. Bagaimana mengintegrasikan teknologi AI untuk melakukan automated assessment terhadap dokumen akreditasi (LED-PS dan LKPS) sesuai dengan 7 kriteria LAM-TEK 2025?

3. Bagaimana mengimplementasikan smart contract untuk mengotomasi workflow akreditasi mulai dari submission, AI recommendation, assessor assignment, assessment, hingga final decision?

4. Bagaimana mengintegrasikan penyimpanan terdesentralisasi dengan enkripsi untuk keamanan dokumen akreditasi?

5. Bagaimana membangun sistem AI recommendation untuk mencocokkan asesor yang tepat dengan submission berdasarkan research area dan expertise?

6. Bagaimana mengevaluasi kinerja, keakuratan assessment AI, dan keamanan sistem yang telah dibangun?

### 1.3 Batasan Masalah

Agar penelitian ini lebih terfokus dan terarah, maka ditetapkan batasan masalah sebagai berikut:

1. Sistem difokuskan untuk proses akreditasi program studi teknik menggunakan **7 Kriteria LAM-TEK 2025**: Diferensiasi Misi (DM), Akuntabilitas (AK), Relevansi Pendidikan-Penelitian-PkM (REL), SDM, Sarana-Prasarana-K3L, Mahasiswa-Luaran, dan Sistem Penjaminan Mutu (SPM)

2. Platform blockchain menggunakan **Hyperledger Fabric** dengan organisasi: UPPS (institusi pengaju), Sekretariat, KEA (Ketua Evaluasi Akreditasi), Asesor, dan Majelis

3. AI service menggunakan **Google Gemini** untuk document analysis dan automated scoring berdasarkan formula LAM-TEK 2025

4. Storage menggunakan **IPFS** (InterPlanetary File System) dengan enkripsi **AES-256** untuk keamanan dokumen

5. Sistem mencakup 4 role pengguna utama: UPPS, Sekretariat/KEA, Asesor, dan Majelis

6. Automated assessment AI fokus pada analisis dokumen LED-PS dan LKPS, scoring calculation berdasarkan formula LAM-TEK 2025, dan consistency checking

7. Assessor profiling menggunakan data dari Teknologi Industri Pertanian IPB dengan integrasi Google Scholar dan Scopus untuk AI recommendation

8. Pengujian sistem dilakukan dalam lingkungan development menggunakan Docker

9. Evaluasi sistem menggunakan metode functionality testing, AI accuracy testing, dan security testing

### 1.4 Tujuan Penelitian

Tujuan dari penelitian ini adalah:

1. Merancang dan mengimplementasikan arsitektur sistem akreditasi berbasis blockchain yang menjamin integritas, immutability, dan transparansi data submission akreditasi LAM-TEK

2. Mengintegrasikan teknologi AI untuk melakukan automated assessment terhadap dokumen akreditasi berdasarkan 7 kriteria LAM-TEK 2025 secara konsisten dan objektif

3. Mengimplementasikan smart contract untuk mengotomasi workflow akreditasi dengan melibatkan multiple stakeholders

4. Mengintegrasikan penyimpanan terdesentralisasi dengan enkripsi untuk keamanan dokumen akreditasi

5. Membangun sistem AI recommendation untuk matching asesor dengan submission berdasarkan research expertise

6. Mengevaluasi kinerja sistem dari segi fungsionalitas, keamanan, dan akurasi penilaian automated assessment AI

### 1.5 Manfaat Penelitian

#### 1.5.1 Manfaat Teoritis
1. Memberikan kontribusi terhadap pengembangan ilmu pengetahuan di bidang blockchain dan artificial intelligence dalam penerapannya pada sistem penjaminan mutu pendidikan tinggi
2. Menjadi referensi bagi penelitian selanjutnya terkait implementasi blockchain dan AI dalam sistem akreditasi dengan multi-stakeholder

#### 1.5.2 Manfaat Praktis
1. **Bagi Institusi Pendidikan (UPPS)**: Mempermudah proses submission dokumen akreditasi dengan sistem yang transparan dan memberikan initial AI scoring sebagai self-assessment
2. **Bagi Asesor**: Membantu proses assessment dengan automated initial scoring yang konsisten dan mendapatkan assignment yang sesuai dengan expertise
3. **Bagi Sekretariat/KEA**: Menyediakan sistem AI recommendation untuk optimal assessor assignment dan monitoring submission secara real-time
4. **Bagi Stakeholder**: Meningkatkan kepercayaan terhadap hasil akreditasi melalui transparansi dan immutability data
5. **Bagi Pengembang Sistem**: Memberikan blueprint arsitektur sistem blockchain-AI yang dapat diadaptasi untuk domain lain

---

## BAB II  
## TINJAUAN PUSTAKA

### 2.1 Sistem Akreditasi Perguruan Tinggi

#### 2.1.1 Definisi Akreditasi
Akreditasi adalah kegiatan penilaian kelayakan program studi dan perguruan tinggi oleh organisasi independen yang dilakukan secara berkala. Akreditasi bertujuan untuk menentukan kelayakan program studi berdasarkan kriteria yang telah ditetapkan dan memberikan jaminan bahwa program studi yang terakreditasi telah memenuhi standar mutu yang ditetapkan [1].

#### 2.1.2 LAM-TEK (Lembaga Akreditasi Mandiri Teknik)
LAM-TEK adalah lembaga akreditasi mandiri yang berwenang melakukan akreditasi untuk program studi di bidang teknik di Indonesia. LAM-TEK 2025 menggunakan sistem akreditasi dengan 7 kriteria penilaian yang lebih komprehensif dibandingkan sistem sebelumnya [1].

#### 2.1.3 7 Kriteria LAM-TEK 2025
LAM-TEK 2025 mengimplementasikan 7 kriteria penilaian yang mencakup seluruh aspek penyelenggaraan program studi [1]:

| Kriteria | Kode | Fokus Penilaian |
|----------|------|-----------------|
| 1. Diferensiasi Misi | DM | Keunikan program studi |
| 2. Akuntabilitas | AK | Governance dan finansial |
| 3. Relevansi Pendidikan, Penelitian, dan PkM | REL | Kualitas akademik |
| 4. Sumber Daya Manusia | SDM | Kualitas dosen |
| 5. Sarana, Prasarana, dan K3L | SARPRAS | Infrastruktur |
| 6. Mahasiswa dan Luaran | MHS | Output mahasiswa |
| 7. Sistem Penjaminan Mutu | SPM | Quality assurance |

#### 2.1.4 Dokumen Akreditasi
Dokumen yang diperlukan dalam proses akreditasi meliputi:
- **LED-PS (Laporan Evaluasi Diri Program Studi)**: Dokumen naratif berisi self-assessment institusi
- **LKPS (Laporan Kinerja Program Studi)**: Data kuantitatif kinerja program studi dalam format spreadsheet

**[Gambar 2.1: Diagram Alur Proses Akreditasi Konvensional LAM-TEK]**
*Deskripsi untuk pembuatan diagram:*
- Flowchart vertikal dengan 6 tahapan utama
- UPPS Submit Dokumen (LED-PS & LKPS) → Desk Evaluation oleh Asesor → Visitasi → Assessment → Review Majelis → Penetapan Hasil
- Gunakan warna berbeda untuk setiap stakeholder (UPPS: biru, Asesor: hijau, Majelis: merah)
- Tunjukkan feedback loop antara tahapan jika ada revisi dokumen

### 2.2 Blockchain

#### 2.2.1 Definisi Blockchain
Blockchain adalah teknologi distributed ledger yang mencatat transaksi secara terdesentralisasi dan aman. Data disimpan dalam blok-blok yang saling terhubung secara kriptografis, membentuk rantai (chain) yang immutable dan transparan [2].

#### 2.2.2 Karakteristik Blockchain
Blockchain memiliki beberapa karakteristik utama yang membuatnya cocok untuk sistem akreditasi:
1. **Decentralization**: Tidak ada otoritas pusat yang mengontrol seluruh sistem
2. **Immutability**: Data yang sudah tercatat tidak dapat diubah atau dihapus
3. **Transparency**: Semua transaksi dapat dilihat oleh participant yang berwenang
4. **Security**: Menggunakan kriptografi untuk mengamankan data [2]

#### 2.2.3 Hyperledger Fabric
Hyperledger Fabric adalah platform blockchain permissioned yang dikembangkan oleh Linux Foundation untuk enterprise use case. Berbeda dengan public blockchain, Hyperledger Fabric memiliki karakteristik [3]:
- **Permissioned Network**: Hanya participant teridentifikasi yang dapat bergabung
- **Modular Architecture**: Komponen dapat dikustomisasi sesuai kebutuhan
- **Smart Contract (Chaincode)**: Business logic yang mengotomasi proses
- **Multiple Organizations**: Mendukung konsensus antar organisasi

**[Gambar 2.2: Arsitektur Hyperledger Fabric untuk Sistem Akreditasi]**
*Deskripsi untuk pembuatan diagram:*
- Arsitektur layered dengan 3 layer utama: Application Layer, Blockchain Layer, Storage Layer
- Application Layer: Frontend (Web App) + Backend API
- Blockchain Layer: 6 Organization nodes (UPPS, Sekadmin, Sekkeu, KEA, Asesor, Majelis) terhubung ke Channel "Akreditasi"
- Storage Layer: Blockchain Ledger + Database untuk off-chain data
- Tampilkan arrows untuk data flow antara layer
- Gunakan warna berbeda untuk setiap organization

#### 2.2.4 Smart Contract
Smart contract adalah program yang berjalan di blockchain dan mengeksekusi perjanjian secara otomatis ketika kondisi tertentu terpenuhi. Dalam konteks akreditasi, smart contract dapat mengotomasi workflow submission, assignment, assessment, dan decision making [3].

### 2.3 InterPlanetary File System (IPFS)

#### 2.3.1 Definisi IPFS
IPFS adalah protokol peer-to-peer untuk penyimpanan dan berbagi data dalam sistem file terdistribusi. IPFS menggunakan content-addressing untuk memastikan setiap file memiliki hash unik yang dapat diverifikasi [4].

#### 2.3.2 Enkripsi AES-256
Untuk menjaga keamanan dokumen, sistem menggunakan enkripsi AES-256 (Advanced Encryption Standard dengan 256-bit key) sebelum menyimpan dokumen ke IPFS. Encryption key disimpan terpisah sehingga hanya pihak yang berwenang dapat mengakses dokumen [5].

**[Gambar 2.3: Alur Enkripsi dan Penyimpanan Dokumen ke IPFS]**
*Deskripsi untuk pembuatan diagram:*
- Flowchart horizontal dengan 5 tahap
- Upload Dokumen → Generate Encryption Key → Enkripsi Dokumen (AES-256) → Upload ke IPFS → Simpan Key + CID ke Database
- Tunjukkan dua path paralel: dokumen terenkripsi ke IPFS, encryption key ke database
- Gunakan icons: document, lock/key, cloud (IPFS), database
- Tambahkan keterangan CID (Content Identifier) dari IPFS

### 2.4 Artificial Intelligence dan Natural Language Processing

#### 2.4.1 Definisi Artificial Intelligence
Artificial Intelligence adalah cabang ilmu komputer yang berfokus pada pembuatan sistem yang dapat melakukan tugas-tugas yang memerlukan kecerdasan manusia, seperti pemahaman bahasa, pengenalan pola, dan pengambilan keputusan [6].

#### 2.4.2 Natural Language Processing (NLP)
NLP adalah bidang AI yang fokus pada interaksi antara komputer dan bahasa manusia. NLP memungkinkan komputer untuk memahami, menginterpretasi, dan menghasilkan bahasa manusia dengan cara yang bermakna [7].

#### 2.4.3 Google Gemini AI
Google Gemini adalah model AI generatif multimodal yang dikembangkan oleh Google DeepMind. Model ini memiliki kemampuan text understanding, document analysis, dan reasoning yang dapat dimanfaatkan untuk menganalisis dokumen akreditasi [8].

#### 2.4.4 Aplikasi AI dalam Automated Assessment
Dalam sistem akreditasi, AI dapat digunakan untuk:
1. **Document Analysis**: Mengekstrak informasi dari LED-PS dan LKPS
2. **Automated Scoring**: Menghitung score berdasarkan kriteria LAM-TEK
3. **Consistency Checking**: Memeriksa konsistensi data antar dokumen
4. **Assessor Recommendation**: Mencocokkan submission dengan asesor berdasarkan research area [6], [7]

**[Gambar 2.4: Workflow AI Automated Assessment]**
*Deskripsi untuk pembuatan diagram:*
- Flowchart vertikal dengan decision points
- Input: LED-PS (PDF) + LKPS (Excel) → AI Document Analysis → Extract Data per Kriteria (1-7) → Calculate Score dengan Formula LAM-TEK → Generate AI Assessment Report
- Tambahkan parallel process: Assessor Profiling Data → AI Matching → Recommend Asesor Pair
- Gunakan diamond shape untuk decision points (document valid?, data complete?)
- Output akhir: AI Score + Recommended Assessors

### 2.5 Penelitian Terkait

Beberapa penelitian terkait yang menjadi referensi:

**Tabel 2.1: Penelitian Terkait Blockchain dan AI dalam Pendidikan**

| No | Penelitian | Hasil | Persamaan & Perbedaan |
|----|-----------|-------|----------------------|
| 1. | Turkanović et al. [9] tentang EduCTX | Blockchain untuk credit transfer dalam higher education | Persamaan: Blockchain dalam pendidikan. Perbedaan: Fokus pada kredit, bukan akreditasi |
| 2. | Sun et al. [10] tentang Blockchain & AI in Education | Kombinasi blockchain dan AI meningkatkan trust dan efisiensi | Persamaan: Integrasi blockchain-AI. Perbedaan: Lebih umum, bukan spesifik akreditasi |
| 3. | Salah et al. [11] tentang Blockchain for AI | Blockchain meningkatkan transparansi AI decision making | Persamaan: Blockchain untuk AI trust. Perbedaan: Tidak spesifik pendidikan |
| 4. | Grech & Camilleri [12] tentang Blockchain in Education | Blockchain potensial untuk credential verification | Persamaan: Blockchain untuk verifikasi. Perbedaan: Fokus sertifikat, bukan proses akreditasi |

---

## BAB III  
## METODOLOGI PENELITIAN

### 3.1 Metode Penelitian

Penelitian ini menggunakan metode Research and Development (R&D) dengan pendekatan kuantitatif dan kualitatif. Metode ini dipilih karena bertujuan untuk menghasilkan produk berupa sistem akreditasi berbasis blockchain dengan integrasi AI, serta menguji efektivitas produk tersebut.

### 3.2 Tahapan Penelitian

**[Gambar 3.1: Diagram Tahapan Penelitian]**
*Deskripsi untuk pembuatan diagram:*
- Diagram alur vertikal dengan 6 tahapan utama (numbered boxes)
- (1) Studi Literatur → (2) Analisis Kebutuhan → (3) Perancangan Sistem → (4) Implementasi → (5) Pengujian → (6) Evaluasi
- Tambahkan feedback loop dari Pengujian ke Implementasi (jika ada bug/improvement)
- Gunakan warna gradient dari biru muda (awal) ke biru tua (akhir)
- Setiap box berisi bullet points aktivitas utama

#### 3.2.1 Studi Literatur

Mengumpulkan dan mempelajari literatur terkait:
- Sistem akreditasi LAM-TEK 2025 dengan 7 kriteria
- Teknologi blockchain khususnya Hyperledger Fabric
- Smart contract dan chaincode development
- Google Gemini AI untuk document analysis
- IPFS untuk decentralized storage
- Enkripsi untuk document security
- Penelitian terkait blockchain dan AI dalam pendidikan

#### 3.2.2 Observasi

Melakukan observasi terhadap:
- Proses akreditasi yang berjalan saat ini di LAM-TEK
- Workflow submission dokumen akreditasi oleh UPPS
- Proses assessment yang dilakukan oleh asesor
- Kendala dan bottleneck dalam sistem akreditasi konvensional
- Kebutuhan stakeholder (UPPS, Asesor, Sekretariat, KEA, Majelis)
- Interaksi antar stakeholder dalam proses akreditasi

#### 3.2.3 Analisis Kebutuhan

Melakukan analisis terhadap:
- Kebutuhan fungsional sistem berdasarkan 7 kriteria LAM-TEK
- Kebutuhan non-fungsional (keamanan, performa, immutability)
- Identifikasi stakeholder dan roles (UPPS, Sekretariat, KEA, Asesor, Majelis)
- Workflow proses akreditasi dari submission hingga decision
- Kebutuhan assessor profiling untuk AI recommendation

#### 3.2.4 Perancangan Sistem

Perancangan sistem mencakup:

##### A. Arsitektur Sistem
- **Blockchain Layer**: Menggunakan Hyperledger Fabric dengan multiple organizations
- **Application Layer**: Backend API dan Frontend Web Application
- **Storage Layer**: Blockchain ledger untuk on-chain data, IPFS untuk dokumen, dan database untuk off-chain data
- **AI Service**: Layanan AI untuk document analysis dan scoring

**[Gambar 3.2: Arsitektur Sistem Keseluruhan]**
*Deskripsi untuk pembuatan diagram:*
- Diagram arsitektur 3-tier dengan boxes and arrows
- Tier 1 (Frontend): Web Browser (User Interface untuk 4 roles) 
- Tier 2 (Backend): REST API Server → Services (Blockchain, AI, IPFS, Scoring, Auth)
- Tier 3 (Data): Hyperledger Fabric Network + IPFS Storage + PostgreSQL Database
- Tunjukkan komunikasi antar tier dengan labeled arrows (HTTP, gRPC, etc)
- Highlight external services: Google Gemini AI, Pinata IPFS
- Gunakan consistent color scheme

##### B. Perancangan Smart Contract
Smart contract dirancang untuk mengotomasi workflow akreditasi dengan functions utama:
- Submission management (create, update, query)
- AI recommendation attachment
- Assessor assignment dan response
- Assessment submission
- Consistency checking
- Final decision

##### C. Perancangan AI Service
AI service dirancang untuk:
- Menganalisis dokumen LED-PS dan LKPS
- Menghitung score berdasarkan 7 kriteria LAM-TEK
- Memberikan rekomendasi asesor berdasarkan matching research area

##### D. Perancangan Security
- Enkripsi dokumen sebelum upload ke IPFS
- Authentication dan authorization untuk akses sistem
- Role-based access control untuk setiap pengguna

**[Gambar 3.3: Workflow Proses Akreditasi dalam Sistem]**
*Deskripsi untuk pembuatan diagram:*
- Diagram swimlane dengan 5 lanes (UPPS, AI System, KEA, Asesor, Majelis)
- Horizontal flow dari kiri ke kanan menunjukkan proses end-to-end:
  1. UPPS: Upload LED-PS & LKPS → Record to Blockchain
  2. AI System: Analyze Documents → Calculate Score → Recommend Assessors
  3. KEA: Review AI Recommendation → Assign Asesor Pair → Record Assignment to Blockchain
  4. Asesor: Review Documents & AI Score → Submit Assessment → Record to Blockchain
  5. Majelis: Review All Data → Make Final Decision → Record to Blockchain
- Gunakan shapes: rectangle (process), cylinder (blockchain record), parallelogram (data)
- Tunjukkan blockchain icons di setiap tahap recording

#### 3.2.5 Implementasi

Implementasi dilakukan dalam beberapa tahap:

##### A. Setup Blockchain Infrastructure
- Instalasi Hyperledger Fabric network
- Konfigurasi organizations dan channel
- Deploy smart contract (chaincode)

##### B. Implementasi Backend
- Development REST API untuk komunikasi dengan blockchain
- Integrasi dengan Google Gemini AI untuk document analysis
- Integrasi dengan IPFS untuk document storage
- Implementasi authentication dan authorization
- Development scoring service berdasarkan formula LAM-TEK

##### C. Implementasi Frontend
- Development user interface untuk setiap role
- Implementasi upload interface untuk dokumen
- Dashboard untuk monitoring submission
- Interface untuk assessment dan decision making

##### D. Implementasi AI Service
- Integration dengan Google Gemini API
- Development prompt engineering untuk setiap kriteria
- Implementasi scoring calculation
- Development assessor recommendation algorithm

#### 3.2.6 Pengujian Sistem

Pengujian dilakukan dengan beberapa metode:

##### A. Functionality Testing
- Testing setiap API endpoint
- Testing workflow end-to-end dari submission hingga decision
- Testing role-based access control
- Testing blockchain transaction recording

##### B. AI Accuracy Testing
- Testing akurasi AI scoring dibandingkan dengan manual asesor
- Evaluasi menggunakan metrics: Precision, Recall, F1-score
- Testing consistency checking capability
- Testing assessor recommendation accuracy

##### C. Security Testing
- Testing enkripsi dan dekripsi dokumen
- Testing authentication dan authorization
- Testing blockchain immutability
- Testing input validation dan error handling

##### D. Performance Testing
- Testing response time untuk setiap operation
- Testing system throughput
- Testing concurrent users handling

#### 3.2.7 Evaluasi dan Analisis

Evaluasi dilakukan terhadap:
- Keberhasilan fungsionalitas sistem
- Akurasi AI assessment
- Performa dan efisiensi sistem
- Keamanan sistem
- Peningkatan efisiensi dibandingkan sistem konvensional

### 3.3 Alat dan Bahan Penelitian

#### 3.3.1 Perangkat Keras
- Laptop/PC dengan spesifikasi minimum:
  - Processor: Intel Core i5 atau setara
  - RAM: 16 GB
  - Storage: 256 GB SSD
  - Internet connection yang stabil

#### 3.3.2 Perangkat Lunak

**Development Tools:**
- Visual Studio Code (Code Editor)
- Node.js untuk backend development
- Git untuk version control
- Docker untuk containerization

**Blockchain Infrastructure:**
- Hyperledger Fabric sebagai blockchain platform
- Fablo untuk fabric network orchestration

**AI Service:**
- Google Gemini API untuk document analysis

**Backend Technologies:**
- Express.js untuk REST API
- PostgreSQL untuk database

**Frontend Technologies:**
- React.js untuk user interface
- Tailwind CSS untuk styling

**Storage:**
- IPFS (via Pinata) untuk decentralized document storage

#### 3.3.3 Data

Data yang digunakan dalam penelitian:
- 34 profil asesor dari Teknologi Industri Pertanian IPB
- Template LKPS LAM-TEK 2025
- Matriks Penilaian LAM-TEK 2025
- Sample dokumen LED-PS dan LKPS untuk testing

### 3.4 Model Pengembangan Perangkat Lunak

Penelitian ini menggunakan metode **Agile Scrum** dengan alasan:
1. Fleksibel terhadap perubahan requirements
2. Development dilakukan secara incremental
3. Testing kontinyu di setiap sprint
4. Feedback loops yang cepat

### 3.5 Jadwal Penelitian

**Tabel 3.1: Jadwal Penelitian**

| Kegiatan | Bulan 1 | Bulan 2 | Bulan 3 | Bulan 4 | Bulan 5 | Bulan 6 |
|----------|---------|---------|---------|---------|---------|---------|
| Penyusunan Proposal | ✓ | | | | | |
| Studi Literatur | | ✓ | ✓ | | | |
| Analisis Kebutuhan | | | ✓ | | | |
| Perancangan Sistem | | | ✓ | ✓ | | |
| Implementasi | | | | ✓ | ✓ | |
| Pengujian Sistem | | | | | ✓ | ✓ |
| Evaluasi | | | | | | ✓ |
| Penulisan Laporan | | | | ✓ | ✓ | ✓ |

**Tempat Penelitian:**
- Development dilakukan di laboratorium/rumah
- Testing menggunakan environment lokal dengan Docker
- Data asesor dari Departemen Teknologi Industri Pertanian IPB

### 3.6 Sistematika Penulisan

Sistematika penulisan skripsi disusun sebagai berikut:

**BAB 1 PENDAHULUAN**  
Berisi latar belakang, identifikasi masalah, batasan masalah, tujuan penelitian, manfaat penelitian, dan sistematika penulisan.

**BAB 2 TINJAUAN PUSTAKA**  
Berisi teori tentang akreditasi LAM-TEK 2025, blockchain, Hyperledger Fabric, IPFS, AI, NLP, serta penelitian terkait.

**BAB 3 ANALISIS DAN PERANCANGAN SISTEM**  
Berisi analisis requirements, perancangan arsitektur sistem, perancangan smart contract, perancangan AI service, dan perancangan database.

**BAB 4 IMPLEMENTASI DAN PENGUJIAN SISTEM**  
Berisi implementasi blockchain network, implementasi backend dan frontend, implementasi AI service, serta hasil pengujian sistem.

**BAB 5 KESIMPULAN DAN SARAN**  
Berisi kesimpulan hasil penelitian, evaluasi keberhasilan sistem, dan saran untuk pengembangan di masa depan.

---

## DAFTAR PUSTAKA

[1] LAM-TEK, "Instrumen Akreditasi LAM-TEK 2025 - 7 Kriteria," Lembaga Akreditasi Mandiri Teknik, Jakarta, Indonesia, 2025.

[2] X. Zheng, R. R. Mukkamala, R. Vatrapu, and J. Ordieres-Mere, "Blockchain challenges and opportunities: A survey," *International Journal of Web and Grid Services*, vol. 14, no. 4, pp. 352-375, 2018.

[3] E. Androulaki *et al.*, "Hyperledger Fabric: A distributed operating system for permissioned blockchains," in *Proceedings of the Thirteenth EuroSys Conference (EuroSys '18)*, Porto, Portugal, 2018, pp. 1-15.

[4] J. Benet, "IPFS - Content addressed, versioned, P2P file system," *arXiv preprint arXiv:1407.3561*, 2014.

[5] National Institute of Standards and Technology, "Advanced Encryption Standard (AES)," *Federal Information Processing Standards Publication 197*, Gaithersburg, MD, USA, 2001.

[6] I. Goodfellow, Y. Bengio, and A. Courville, *Deep Learning*. Cambridge, MA, USA: MIT Press, 2016.

[7] D. Jurafsky and J. H. Martin, *Speech and Language Processing*, 3rd ed. Stanford, CA, USA: Stanford University, 2023.

[8] Google DeepMind, "Gemini: A family of highly capable multimodal models," *Google Technical Report*, 2024. [Online]. Available: https://deepmind.google/technologies/gemini/

[9] M. Turkanović, M. Hölbl, K. Košič, M. Heričko, and A. Kamišalić, "EduCTX: A blockchain-based higher education credit platform," *IEEE Access*, vol. 6, pp. 5112-5127, 2018.

[10] Q. Sun, K. Xia, and J. Zhang, "Application of blockchain and artificial intelligence in education," in *Proc. 2020 Int. Conf. on Artificial Intelligence and Education (ICAIE)*, Tianjin, China, 2020, pp. 151-155.

[11] K. Salah, M. H. U. Rehman, N. Nizamuddin, and A. Al-Fuqaha, "Blockchain for AI: Review and open research challenges," *IEEE Access*, vol. 7, pp. 10127-10149, 2019.

[12] A. Grech and A. F. Camilleri, "Blockchain in education," *European Commission JRC Science for Policy Report*, Luxembourg, 2017.

[13] F. Casino, T. K. Dasaklis, and C. Patsakis, "A systematic literature review of blockchain-based applications: Current status, classification and open issues," *Telematics and Informatics*, vol. 36, pp. 55-81, Mar. 2019.

[14] S. Nakamoto, "Bitcoin: A peer-to-peer electronic cash system," *White Paper*, 2008. [Online]. Available: https://bitcoin.org/bitcoin.pdf

[15] H. Aldowah, H. Al-Samarraie, and W. M. Fauzy, "Educational data mining and learning analytics for 21st century higher education: A review and synthesis," *Telematics and Informatics*, vol. 37, pp. 13-49, Apr. 2019.

[16] T. Brown *et al.*, "Language models are few-shot learners," in *Advances in Neural Information Processing Systems 33 (NeurIPS 2020)*, 2020, pp. 1877-1901.

[17] Y. Chen, S. Ding, Z. Xu, H. Zheng, and S. Yang, "Blockchain-based medical records secure storage and medical service framework," *Journal of Medical Systems*, vol. 43, no. 1, pp. 1-9, Jan. 2019.

[18] N. Kshetri and J. Voas, "Blockchain-enabled e-voting," *IEEE Software*, vol. 35, no. 4, pp. 95-99, Jul./Aug. 2018.

[19] M. A. Ferrag, M. Derdour, M. Mukherjee, A. Derhab, L. Maglaras, and H. Janicke, "Blockchain technologies for the Internet of Things: Research issues and challenges," *IEEE Internet of Things Journal*, vol. 6, no. 2, pp. 2188-2204, Apr. 2019.

[20] R. Sharma, "Artificial intelligence in education: AI and the future of learning," *International Journal of Advanced Research in Computer Science*, vol. 10, no. 3, pp. 30-35, 2019.

---

## LAMPIRAN: DESKRIPSI DIAGRAM YANG PERLU DIBUAT

### Diagram 2.1: Proses Akreditasi Konvensional LAM-TEK
- **Tipe**: Flowchart vertikal
- **Elemen**: 6 tahapan utama dengan warna berbeda per stakeholder
- **Tujuan**: Menunjukkan alur proses akreditasi saat ini dan identifikasi bottleneck

### Diagram 2.2: Arsitektur Hyperledger Fabric
- **Tipe**: Architecture diagram layered
- **Elemen**: 3 layers (Application, Blockchain, Storage) dengan 6 organizations
- **Tujuan**: Menjelaskan struktur blockchain yang digunakan

### Diagram 2.3: Alur Enkripsi dan Penyimpanan IPFS
- **Tipe**: Flowchart horizontal dengan parallel paths
- **Elemen**: 5 tahap proses dengan icons untuk visual clarity
- **Tujuan**: Menjelaskan bagaimana dokumen dienkripsi dan disimpan secara aman

### Diagram 2.4: Workflow AI Automated Assessment
- **Tipe**: Flowchart dengan decision points
- **Elemen**: Input → Processing → Output dengan parallel AI matching process
- **Tujuan**: Menunjukkan bagaimana AI menganalisis dokumen dan memberikan score

### Diagram 3.1: Tahapan Penelitian
- **Tipe**: Sequential flow diagram vertikal
- **Elemen**: 6 numbered boxes dengan feedback loop
- **Tujuan**: Menunjukkan metodologi penelitian dari awal hingga akhir

### Diagram 3.2: Arsitektur Sistem Keseluruhan
- **Tipe**: 3-tier architecture diagram
- **Elemen**: Frontend - Backend - Data tier dengan service connections
- **Tujuan**: Memberikan overview lengkap arsitektur sistem yang dibangun

### Diagram 3.3: Workflow Proses Akreditasi dalam Sistem
- **Tipe**: Swimlane diagram horizontal
- **Elemen**: 5 lanes untuk stakeholders dengan blockchain recording points
- **Tujuan**: Menunjukkan end-to-end process dalam sistem baru dengan blockchain

---

**Catatan:**
- ✅ Referensi menggunakan format IEEE (numbered citation)
- ✅ Deskripsi diagram disertakan untuk setiap gambar yang perlu dibuat
- ✅ Detail teknis dikurangi, lebih fokus pada konsep untuk proposal
- ✅ Bahasa lebih akademis dan sesuai untuk proposal skripsi
