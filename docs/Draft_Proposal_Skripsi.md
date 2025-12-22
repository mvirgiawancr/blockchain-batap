# DRAFT PROPOSAL SKRIPSI

**SISTEM AKREDITASI BERBASIS BLOCKCHAIN DENGAN INTEGRASI ARTIFICIAL INTELLIGENCE UNTUK AUTOMATED ASSESSMENT**

---

## BAB I  
## PENDAHULUAN

### 1.1 Latar Belakang

Akreditasi merupakan proses penting dalam menjamin kualitas pendidikan tinggi di Indonesia. Badan Akreditasi Nasional Perguruan Tinggi (BAN-PT) bertugas melakukan penilaian kelayakan program studi dan institusi pendidikan untuk memastikan standar mutu yang telah ditetapkan terpenuhi. Namun, sistem akreditasi konvensional yang berlaku saat ini menghadapi berbagai tantangan yang menghambat efisiensi dan transparansi proses.

Permasalahan utama dalam sistem akreditasi saat ini meliputi: (1) proses verifikasi dokumen yang memakan waktu lama dan rentan terhadap manipulasi data, (2) kurangnya transparansi dalam proses penilaian yang dapat menimbulkan keraguan terhadap objektivitas hasil, (3) beban administratif yang tinggi baik bagi institusi yang diakreditasi maupun asesor, serta (4) inkonsistensi penilaian antar asesor yang dapat mempengaruhi keadilan hasil akreditasi.

Di era digital dan Industry 4.0, teknologi blockchain dan artificial intelligence (AI) menawarkan solusi inovatif untuk mengatasi permasalahan tersebut. Blockchain, dengan karakteristik desentralisasi, immutability, dan transparansi, dapat memastikan integritas data akreditasi dan mencegah manipulasi dokumen. Sementara itu, AI dapat dimanfaatkan untuk melakukan automated assessment yang konsisten, objektif, dan efisien dalam mengevaluasi dokumen-dokumen akreditasi.

Penelitian ini bertujuan untuk membangun sistem akreditasi berbasis blockchain yang terintegrasi dengan teknologi AI untuk automated assessment. Sistem yang dibangun akan memanfaatkan smart contract untuk mengotomasi workflow akreditasi, menggunakan InterPlanetary File System (IPFS) untuk penyimpanan dokumen terdesentralisasi, dan menerapkan algoritma machine learning untuk analisis dan penilaian otomatis dokumen akreditasi. Dengan integrasi kedua teknologi ini, diharapkan dapat tercapai sistem akreditasi yang lebih transparan, efisien, akurat, dan terpercaya.

### 1.2 Rumusan Masalah

Berdasarkan latar belakang yang telah diuraikan, maka rumusan masalah dalam penelitian ini adalah:

1. Bagaimana merancang arsitektur sistem akreditasi berbasis blockchain yang dapat menjamin integritas dan transparansi data akreditasi?
2. Bagaimana mengintegrasikan teknologi artificial intelligence untuk melakukan automated assessment terhadap dokumen akreditasi?
3. Bagaimana membangun sistem yang dapat mengotomasi workflow akreditasi mulai dari submission, assessment, hingga verification menggunakan smart contract?
4. Bagaimana mengevaluasi kinerja dan keakuratan sistem akreditasi berbasis blockchain dengan integrasi AI yang telah dibangun?

### 1.3 Batasan Masalah

Agar penelitian ini lebih terfokus dan terarah, maka ditetapkan batasan masalah sebagai berikut:

1. Sistem yang dikembangkan difokuskan untuk proses akreditasi program studi di perguruan tinggi
2. Automated assessment menggunakan AI difokuskan pada penilaian dokumen-dokumen akreditasi tertentu seperti kurikulum, dokumen pembelajaran, dan dokumen penelitian
3. Blockchain yang digunakan adalah Ethereum dengan implementasi smart contract menggunakan Solidity
4. Model AI yang digunakan adalah Natural Language Processing (NLP) untuk analisis dokumen teks dan machine learning untuk scoring
5. Sistem tidak mencakup seluruh aspek akreditasi, namun fokus pada automated document verification dan scoring
6. Pengujian sistem dilakukan dalam lingkungan simulasi/testnet
7. Evaluasi sistem menggunakan metode blackbox testing untuk fungsionalitas dan accuracy testing untuk model AI

### 1.4 Tujuan Penelitian

Tujuan dari penelitian ini adalah:

1. Merancang dan mengimplementasikan arsitektur sistem akreditasi berbasis blockchain yang menjamin integritas dan transparansi data
2. Mengintegrasikan teknologi AI untuk melakukan automated assessment terhadap dokumen akreditasi secara konsisten dan objektif
3. Membangun sistem yang mengotomasi workflow akreditasi menggunakan smart contract
4. Mengevaluasi kinerja sistem dari segi fungsionalitas, keamanan, dan akurasi penilaian AI

### 1.5 Manfaat Penelitian

Manfaat yang diharapkan dari penelitian ini adalah:

#### 1.5.1 Manfaat Teoritis
1. Memberikan kontribusi terhadap pengembangan ilmu pengetahuan di bidang blockchain dan artificial intelligence, khususnya dalam penerapannya pada sistem akreditasi pendidikan
2. Menjadi referensi bagi penelitian selanjutnya terkait implementasi teknologi blockchain dan AI dalam sistem penjaminan mutu pendidikan

#### 1.5.2 Manfaat Praktis
1. **Bagi Institusi Pendidikan**: Mempermudah proses submission dokumen akreditasi dengan sistem yang transparan dan efisien
2. **Bagi Asesor**: Membantu proses assessment dengan automated initial scoring yang konsisten dan mengurangi beban administratif
3. **Bagi Stakeholder**: Meningkatkan kepercayaan terhadap hasil akreditasi melalui transparansi dan immutability data di blockchain
4. **Bagi BAN-PT**: Menyediakan sistem yang dapat meningkatkan efisiensi dan objektivitas proses akreditasi

---

## BAB II  
## TINJAUAN PUSTAKA

### 2.1 Sistem Akreditasi Perguruan Tinggi

#### 2.1.1 Definisi Akreditasi
Akreditasi adalah kegiatan penilaian kelayakan program studi dan perguruan tinggi oleh organisasi independen yang dilakukan secara berkala. Akreditasi bertujuan untuk menentukan kelayakan program studi dan perguruan tinggi berdasarkan kriteria yang telah ditetapkan dan memberikan jaminan bahwa program studi dan perguruan tinggi yang terakreditasi telah memenuhi standar mutu yang ditetapkan.

#### 2.1.2 Proses Akreditasi BAN-PT
Proses akreditasi di Indonesia dilakukan oleh BAN-PT meliputi tahapan:
1. **Evaluasi Diri (ED)**: Institusi melakukan self-assessment dan menyusun dokumen evaluasi diri
2. **Submission Dokumen**: Pengajuan dokumen akreditasi melalui sistem
3. **Desk Evaluation**: Asesor melakukan penilaian awal terhadap dokumen yang diajukan
4. **Visitasi**: Kunjungan asesor ke institusi untuk verifikasi dan validasi data
5. **Assessment**: Proses penilaian komprehensif oleh team asesor
6. **Penetapan Hasil**: BAN-PT menetapkan peringkat akreditasi

#### 2.1.3 Instrumen Akreditasi
Instrumen akreditasi terdiri dari berbagai komponen penilaian seperti visi-misi, tata pamong, mahasiswa, sumber daya manusia, keuangan, sarana prasarana, pendidikan, penelitian, dan pengabdian masyarakat.

### 2.2 Blockchain

#### 2.2.1 Definisi Blockchain
Blockchain adalah teknologi distributed ledger yang mencatat transaksi secara terdesentralisasi dan aman. Data disimpan dalam blok-blok yang saling terhubung secara kriptografis, membentuk rantai (chain) yang immutable dan transparan.

#### 2.2.2 Karakteristik Blockchain
1. **Decentralization**: Tidak ada otoritas pusat yang mengontrol sistem
2. **Immutability**: Data yang sudah tercatat tidak dapat diubah atau dihapus
3. **Transparency**: Semua transaksi dapat dilihat oleh semua participant
4. **Security**: Menggunakan kriptografi untuk mengamankan data
5. **Consensus**: Menggunakan mekanisme konsensus untuk validasi transaksi

#### 2.2.3 Smart Contract
Smart contract adalah program komputer yang berjalan di atas blockchain dan mengeksekusi perjanjian secara otomatis ketika kondisi tertentu terpenuhi. Smart contract dapat digunakan untuk mengotomasi berbagai proses bisnis tanpa memerlukan intermediary.

#### 2.2.4 Ethereum
Ethereum adalah platform blockchain yang mendukung smart contract. Ethereum menggunakan Ethereum Virtual Machine (EVM) untuk menjalankan smart contract yang ditulis dalam bahasa Solidity.

#### 2.2.5 InterPlanetary File System (IPFS)
IPFS adalah protokol peer-to-peer untuk penyimpanan dan berbagi data dalam sistem file terdistribusi. IPFS menggunakan content-addressing untuk memastikan setiap file memiliki hash unik yang dapat diverifikasi.

### 2.3 Artificial Intelligence (AI)

#### 2.3.1 Definisi Artificial Intelligence
Artificial Intelligence adalah cabang ilmu komputer yang berfokus pada pembuatan sistem yang dapat melakukan tugas-tugas yang memerlukan kecerdasan manusia, seperti pemahaman bahasa, pengenalan pola, dan pengambilan keputusan.

#### 2.3.2 Machine Learning
Machine Learning adalah subset dari AI yang memungkinkan sistem untuk belajar dan meningkatkan performanya dari pengalaman tanpa diprogram secara eksplisit. Machine learning dapat dibagi menjadi:
1. **Supervised Learning**: Belajar dari data yang sudah dilabeli
2. **Unsupervised Learning**: Menemukan pola dalam data yang tidak dilabeli
3. **Reinforcement Learning**: Belajar melalui trial and error dengan sistem reward

#### 2.3.3 Natural Language Processing (NLP)
NLP adalah bidang AI yang fokus pada interaksi antara komputer dan bahasa manusia. NLP memungkinkan komputer untuk memahami, menginterpretasi, dan menghasilkan bahasa manusia dengan cara yang bermakna.

#### 2.3.4 Document Analysis dan Assessment
Teknik AI dapat digunakan untuk menganalisis dan menilai dokumen secara otomatis, meliputi:
1. **Text Classification**: Mengkategorikan dokumen berdasarkan konten
2. **Information Extraction**: Mengekstrak informasi penting dari dokumen
3. **Document Similarity**: Mengukur kesamaan antar dokumen
4. **Quality Assessment**: Menilai kualitas dokumen berdasarkan kriteria tertentu

### 2.4 Integrasi Blockchain dan AI

#### 2.4.1 Sinergitas Blockchain dan AI
Integrasi blockchain dan AI dapat menghasilkan sistem yang lebih powerful:
1. **AI untuk Blockchain**: AI dapat meningkatkan efisiensi mining, deteksi anomali, dan optimasi smart contract
2. **Blockchain untuk AI**: Blockchain dapat menyediakan data training yang trustworthy, transparansi dalam decision making AI, dan decentralized AI models

#### 2.4.2 Use Case dalam Pendidikan
Penerapan blockchain dan AI dalam pendidikan telah dilakukan untuk:
1. Credential verification dan digital certificates
2. Learning analytics dan personalized learning
3. Plagiarism detection dan content authenticity
4. Automated grading dan assessment

### 2.5 Penelitian Terkait

#### [Tabel Penelitian Terkait akan diisi dengan 7-10 penelitian relevan]

| No | Judul Penelitian | Penulis & Tahun | Hasil Penelitian | Persamaan & Perbedaan |
|----|------------------|-----------------|------------------|----------------------|
| 1. | Blockchain-Based Academic Certificate Verification System | [Author], [Year] | Sistem dapat memverifikasi sertifikat akademik dengan blockchain | Persamaan: Menggunakan blockchain untuk verifikasi dokumen pendidikan. Perbedaan: Fokus pada sertifikat, bukan proses akreditasi |
| 2. | AI-Powered Automated Essay Scoring System | [Author], [Year] | AI dapat menilai esai dengan akurasi mendekati human grader | Persamaan: Menggunakan AI untuk automated assessment. Perbedaan: Fokus pada essay, bukan dokumen akreditasi |
| ... | ... | ... | ... | ... |

---

## BAB III  
## METODOLOGI PENELITIAN

### 3.1 Metode Penelitian

Penelitian ini menggunakan metode Research and Development (R&D) dengan pendekatan kuantitatif dan kualitatif. Metode ini dipilih karena bertujuan untuk menghasilkan produk berupa sistem akreditasi berbasis blockchain dengan integrasi AI, serta menguji efektivitas produk tersebut.

### 3.2 Tahapan Penelitian

Penelitian ini dilakukan melalui tahapan-tahapan sebagai berikut:

#### 3.2.1 Studi Literatur
Mengumpulkan dan mempelajari literatur terkait:
- Sistem akreditasi perguruan tinggi di Indonesia
- Teknologi blockchain dan smart contract
- Artificial intelligence dan machine learning
- Natural language processing untuk document analysis
- Penelitian-penelitian terkait implementasi blockchain dan AI dalam pendidikan

#### 3.2.2 Analisis Kebutuhan
Melakukan analisis terhadap:
- Kebutuhan fungsional sistem akreditasi
- Kebutuhan non-fungsional (keamanan, performa, usability)
- Identifikasi stakeholder (institusi, asesor, admin BAN-PT)
- Workflow proses akreditasi yang akan diotomasi
- Jenis dokumen yang akan di-assess oleh AI

#### 3.2.3 Perancangan Sistem
Merancang sistem meliputi:
- **Arsitektur Sistem**: Merancang arsitektur blockchain, backend, frontend, dan AI service
- **Database Design**: Merancang struktur database untuk menyimpan data off-chain
- **Smart Contract Design**: Merancang smart contract untuk workflow akreditasi
- **AI Model Design**: Merancang model AI untuk document assessment
- **Interface Design**: Merancang user interface untuk berbagai role pengguna

#### 3.2.4 Implementasi

##### A. Implementasi Blockchain
- Setup Ethereum development environment (Hardhat/Truffle)
- Implementasi smart contract untuk:
  - User management (institusi, asesor, admin)
  - Submission management
  - Assessment workflow
  - Verification dan final decision
- Deploy smart contract ke testnet (Sepolia/Goerli)
- Integrasi IPFS untuk document storage

##### B. Implementasi AI Service
- Data collection dan preparation untuk training
- Preprocessing dokumen akreditasi
- Training model NLP untuk:
  - Document classification
  - Quality assessment
  - Completeness checking
  - Scoring prediction
- Testing dan optimization model
- Deployment AI model sebagai service

##### C. Implementasi Backend
- Setup backend framework (Node.js/Express atau Python/FastAPI)
- Implementasi API untuk:
  - Interaksi dengan smart contract (Web3.js/Ethers.js)
  - Interaksi dengan IPFS
  - Interaksi dengan AI service
  - Database operations
- Implementasi authentication dan authorization
- Implementasi logging dan monitoring

##### D. Implementasi Frontend
- Setup frontend framework (React/Vue/Angular)
- Implementasi interface untuk:
  - Login dan registration
  - Dashboard untuk setiap role
  - Document submission
  - Assessment interface
  - Verification interface
  - Status tracking
- Integrasi dengan MetaMask untuk blockchain interaction
- Responsive design untuk berbagai device

#### 3.2.5 Pengujian Sistem

##### A. Testing Smart Contract
- Unit testing untuk setiap function dalam smart contract
- Integration testing untuk workflow
- Security audit untuk vulnerabilities
- Gas optimization testing

##### B. Testing AI Model
- Accuracy testing dengan test dataset
- Precision, recall, dan F1-score evaluation
- Comparison dengan human assessment
- Bias detection testing

##### C. Testing Sistem Keseluruhan
- Functional testing (blackbox testing)
- Usability testing dengan user
- Performance testing (load testing)
- Security testing
- Integration testing antar komponen

#### 3.2.6 Evaluasi dan Analisis
- Analisis hasil pengujian fungsionalitas sistem
- Analisis akurasi AI assessment
- Analisis performa sistem (response time, throughput)
- Analisis biaya transaksi blockchain (gas fees)
- Perbandingan dengan sistem konvensional

### 3.3 Alat dan Bahan Penelitian

#### 3.3.1 Perangkat Keras
- Laptop/PC dengan spesifikasi:
  - Processor: Intel Core i5 atau setara
  - RAM: 8 GB minimum (16 GB recommended)
  - Storage: 256 GB SSD
  - Internet connection yang stabil

#### 3.3.2 Perangkat Lunak
**Development Tools:**
- Visual Studio Code atau IDE lain
- Node.js dan npm
- Git untuk version control

**Blockchain:**
- Hardhat atau Truffle untuk smart contract development
- Ganache untuk local blockchain
- MetaMask untuk blockchain interaction
- Ethereum testnet (Sepolia/Goerli)
- IPFS for storage

**AI/ML:**
- Python 3.x
- TensorFlow atau PyTorch
- Scikit-learn
- NLTK atau spaCy untuk NLP
- Jupyter Notebook

**Backend:**
- Node.js dengan Express.js atau Python dengan FastAPI
- Web3.js atau Ethers.js
- Database: MongoDB atau PostgreSQL

**Frontend:**
- React.js atau Vue.js
- Web3 libraries
- UI framework (Material-UI, Ant Design, atau Tailwind CSS)

#### 3.3.3 Data
- Data dokumen akreditasi (contoh dokumen kurikulum, RPS, dll)
- Data hasil penilaian asesor untuk training AI model
- Data instrumen akreditasi BAN-PT

### 3.4 Model Pengembangan Perangkat Lunak

Penelitian ini menggunakan metode **Agile Scrum** sebagai model pengembangan perangkat lunak. Agile Scrum dipilih karena:

1. **Iteratif dan Incremental**: Memungkinkan pengembangan sistem secara bertahap dengan feedback kontinyu
2. **Fleksibel**: Dapat mengakomodasi perubahan requirements selama development
3. **Sprint-based**: Mengorganisir pekerjaan dalam sprint 2-4 minggu
4. **Continuous Testing**: Testing dilakukan di setiap sprint
5. **Stakeholder Involvement**: Melibatkan stakeholder dalam review setiap sprint

#### Sprint Planning:
- **Sprint 1-2**: Setup environment, analisis requirements, dan design sistem
- **Sprint 3-4**: Implementasi smart contract dan blockchain infrastructure
- **Sprint 5-6**: Implementasi AI model dan service
- **Sprint 7-8**: Implementasi backend dan API
- **Sprint 9-10**: Implementasi frontend
- **Sprint 11-12**: Integration, testing, dan refinement

### 3.5 Jadwal Penelitian

| Kegiatan | Jan | Feb | Mar | Apr | Mei | Jun |
|----------|-----|-----|-----|-----|-----|-----|
| **Proposal** | | | | | | |
| - Penyusunan proposal | W1-2 | | | | | |
| - Revisi proposal | W3-4 | | | | | |
| **Bimbingan Bab 1-2** | | | | | | |
| - Studi literatur | | W1-4 | W1-2 | | | |
| - Penulisan Bab 1-2 | | | W3-4 | W1 | | |
| **Bimbingan Bab 3** | | | | | | |
| - Analisis & perancangan | | | | W2-3 | W1 | |
| - Penulisan Bab 3 | | | | W4 | W2 | |
| **Pembangunan Aplikasi** | | | | | | |
| - Sprint 1-4 (Blockchain & AI) | | | | | W3-4 | W1-2 |
| - Sprint 5-8 (Backend & Frontend) | | | | | | W3-4 |
| **Bimbingan Bab 4** | | | | | | |
| - Implementasi & testing | | | | | | W3-4 |
| - Penulisan Bab 4 | | | | | | W4 |
| **Bimbingan Bab 5** | | | | | | |
| - Evaluasi & kesimpulan | | | | | | W4 |
| - Penulisan Bab 5 | | | | | | W4 |
| **Finalisasi** | | | | | | W4 |

*Keterangan: W = Week (Minggu)*

**Tempat Penelitian:**
- Laboratorium Komputer/Rumah untuk development
- Simulasi dengan data dummy dan sample dokumen akreditasi

### 3.6 Sistematika Penulisan

Sistematika penulisan dalam penelitian ini disusun sebagai berikut:

**BAB 1 PENDAHULUAN**  
Bab ini berisi latar belakang, rumusan masalah, batasan masalah, tujuan penelitian, manfaat penelitian, metode penelitian, dan sistematika penulisan.

**BAB 2 TINJAUAN PUSTAKA**  
Bab ini berisi konsep dasar dan teori pendukung yang berhubungan dengan sistem akreditasi, blockchain, smart contract, IPFS, artificial intelligence, machine learning, NLP, serta penelitian-penelitian terkait.

**BAB 3 ANALISIS DAN PERANCANGAN SISTEM**  
Bab ini berisi analisis kebutuhan sistem, perancangan arsitektur sistem, perancangan smart contract, perancangan AI model, perancangan database, perancangan interface, dan perancangan workflow sistem.

**BAB 4 IMPLEMENTASI DAN PENGUJIAN SISTEM**  
Bab ini berisi implementasi dari perancangan sistem yang telah dilakukan pada Bab 3, meliputi implementasi smart contract, AI model, backend, dan frontend. Selain itu, bab ini juga berisi hasil pengujian sistem untuk mengetahui kelayakan dan kinerja sistem yang dibangun.

**BAB 5 KESIMPULAN DAN SARAN**  
Bab ini berisi kesimpulan yang diperoleh dari hasil penelitian serta saran untuk pengembangan sistem di masa mendatang.

---

## DAFTAR PUSTAKA

[1] Badan Akreditasi Nasional Perguruan Tinggi, "Instrumen Akreditasi Program Studi," BAN-PT, 2023. [Online]. Available: https://www.banpt.or.id

[2] S. Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System," 2008. [Online]. Available: https://bitcoin.org/bitcoin.pdf

[3] G. Wood, "Ethereum: A Secure Decentralised Generalised Transaction Ledger," Ethereum Project Yellow Paper, 2014.

[4] J. Benet, "IPFS - Content Addressed, Versioned, P2P File System," Protocol Labs, 2014.

[5] I. Goodfellow, Y. Bengio, and A. Courville, "Deep Learning," MIT Press, 2016.

[6] T. Mitchell, "Machine Learning," McGraw Hill, 1997.

[7] D. Jurafsky and J. H. Martin, "Speech and Language Processing," 3rd ed., 2023.

[8] M. A. Nielsen, "Neural Networks and Deep Learning," Determination Press, 2015.

[9] A. K. Jain and B. Chandrasekaran, "Dimensionality and sample size considerations in pattern recognition practice," Handbook of Statistics, vol. 2, pp. 835-855, 1982.

[10] F. Casino, T. K. Dasaklis, and C. Patsakis, "A systematic literature review of blockchain-based applications: Current status, classification and open issues," Telematics and Informatics, vol. 36, pp. 55-81, 2019.

[11] K. Salah, M. H. U. Rehman, N. Nizamuddin, and A. Al-Fuqaha, "Blockchain for AI: Review and Open Research Challenges," IEEE Access, vol. 7, pp. 10127-10149, 2019.

[12] M. Turkanović, M. Hölbl, K. Košič, M. Heričko, and A. Kamišalić, "EduCTX: A Blockchain-Based Higher Education Credit Platform," IEEE Access, vol. 6, pp. 5112-5127, 2018.

[13] Q. Sun, K. Xia, and J. Zhang, "Application of Blockchain and Artificial Intelligence in Education," in Proceedings of the 2020 International Conference on Artificial Intelligence and Education (ICAIE), 2020.

[14] A. Grech and A. F. Camilleri, "Blockchain in Education," European Commission JRC Science for Policy Report, 2017.

[15] P. Devine, "Blockchain Learning: Can Crypto-Currency Methods Be Appropriated to Enhance Online Learning?," in Proc. ALT Online Winter Conference, 2015.

[16] Y. Chen, Q. Ding, X. Zheng, and P. Zhang, "Blockchain-based Medical Records Secure Storage and Medical Service Framework," Journal of Medical Systems, vol. 43, no. 1, pp. 1-9, 2019.

[17] S. Haber and W. S. Stornetta, "How to Time-Stamp a Digital Document," Journal of Cryptology, vol. 3, no. 2, pp. 99-111, 1991.

[18] N. Kshetri and J. Voas, "Blockchain-Enabled E-Voting," IEEE Software, vol. 35, no. 4, pp. 95-99, 2018.

[19] M. A. Ferrag, M. Derdour, M. Mukherjee, A. Derhab, L. Maglaras, and H. Janicke, "Blockchain Technologies for the Internet of Things: Research Issues and Challenges," IEEE Internet of Things Journal, vol. 6, no. 2, pp. 2188-2204, 2019.

[20] R. Sharma, "Artificial Intelligence in Education: AI and the Future of Learning," International Journal of Advanced Research in Computer Science, vol. 10, no. 3, 2019.

[21] M. M. Chiu and C. K. K. Khoo, "A New Method for Analyzing Sequential Processes: Dynamic Multi-Level Analysis," Small Group Research, vol. 36, no. 5, pp. 600-631, 2005.

[22] H. Aldowah, H. Al-Samarraie, and W. M. Fauzy, "Educational data mining and learning analytics for 21st century higher education: A review and synthesis," Telematics and Informatics, vol. 37, pp. 13-49, 2019.

[23] S. B. Kotsiantis, "Use of machine learning techniques for educational proposes: a decision support system for forecasting students' grades," Artificial Intelligence Review, vol. 37, no. 4, pp. 331-344, 2012.

[24] V. Buterin, "A Next-Generation Smart Contract and Decentralized Application Platform," Ethereum White Paper, 2014.

[25] A. Patel, "Solidity Programming Essentials: A Beginner's Guide to Build Smart Contracts for Ethereum and Blockchain," Packt Publishing, 2018.

---

**Catatan:**
- Draft proposal ini disusun berdasarkan referensi proposal tahun lalu dengan metode ATM (Amati, Tiru, Modifikasi)
- Beberapa bagian masih memerlukan data spesifik yang perlu disesuaikan:
  - Tabel penelitian terkait (Bab II) perlu diisi dengan penelitian-penelitian terbaru yang relevan
  - Jadwal penelitian perlu disesuaikan dengan timeline yang Anda miliki
  - Daftar pustaka dapat ditambahkan sesuai dengan literatur yang Anda gunakan
- Proposal ini dapat dikembangkan lebih lanjut sesuai dengan arahan dosen pembimbing
