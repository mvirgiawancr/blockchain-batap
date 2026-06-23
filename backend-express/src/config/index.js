// Environment Configuration for LAM-TEK 2025 Backend
require('dotenv').config();

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 8000,
    env: process.env.NODE_ENV || 'development',
    apiPrefix: '/api/v1'
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  },

  // Google Gemini AI Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    // Model GA stabil yang dipakai saat model utama (mis. preview) balas 503/overload.
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2',
    minRequestIntervalMs: parseInt(process.env.GEMINI_MIN_REQUEST_INTERVAL_MS || '4000')
  },

  // Toggle Full RAG. FULL_RAG=false → mode "lightweight" (retrieval kata kunci, versi lama).
  // Default (tidak diset) → full RAG (pgvector + embedding). Alias lama: RAG_ENABLED.
  rag: {
    enabled: !['false', '0', 'no', 'off'].includes(
      String(process.env.FULL_RAG ?? process.env.RAG_ENABLED ?? 'true').toLowerCase()
    ),
    embeddingEnabled: !['false', '0', 'no', 'off'].includes(
      String(process.env.EMBEDDING ?? process.env.RAG_EMBEDDING ?? process.env.EMBEDDING_ENABLED ?? 'true').toLowerCase()
    ),
    embeddingProvider: process.env.EMBEDDING_PROVIDER || process.env.RAG_EMBEDDING_PROVIDER || 'local'
  },

  // Toggle live data scraping. SCRAPING_DATA=false -> direct database retrieval for assessor profiles.
  scraping: {
    enabled: !['false', '0', 'no', 'off'].includes(
      String(process.env.SCRAPING_DATA ?? 'true').toLowerCase()
    )
  },


  // Pinata IPFS Configuration (for document storage)
  pinata: {
    jwt: process.env.PINATA_JWT,
    gateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
  },

  // Hyperledger Fabric Configuration
  fabric: {
    networkName: 'akreditasi',
    channelName: 'akreditasi',
    chaincodeName: 'submission-contract',
    mspId: process.env.FABRIC_MSP_ID || 'SekretariatAdminMSP',
    walletPath: process.env.FABRIC_WALLET_PATH || './wallet',
    connectionProfile: process.env.FABRIC_CONNECTION_PROFILE || '../fablo-target/fabric-config/connection-profiles/connection-profile-sekretariatadmin.json'
  },

  // LAM-TEK 2025 Configuration (Instrumen 2025)
  lamtek: {
    criteriaCount: 7, // 7 kriteria penilaian (Kriteria 8 = Program Pengembangan, tidak dinilai)
    criteria: [
      { 
        id: 1, 
        name: 'Diferensiasi Misi', 
        code: 'DM',
        bobot: 2.05,
        butir: ['1.1 Visi, Misi, Tujuan dan Sasaran (Indikator Kinerja Utama)']
      },
      { 
        id: 2, 
        name: 'Akuntabilitas', 
        code: 'AK',
        bobot: 7.06,
        butir: [
          '2.1 Tata Pamong dan Tata Kelola',
          '2.2 Kerja Sama',
          '2.3 Keuangan'
        ]
      },
      { 
        id: 3, 
        name: 'Relevansi Pendidikan, Penelitian, dan PkM', 
        code: 'REL',
        bobot: 22.45,
        butir: [
          '3.1 Pendidikan',
          '3.2 Penelitian',
          '3.3 Pengabdian kepada Masyarakat'
        ]
      },
      { 
        id: 4, 
        name: 'Sumber Daya Manusia', 
        code: 'SDM',
        bobot: 13.44,
        butir: [
          '4.1 Profil Dosen dan Tenaga Kependidikan',
          '4.2 Beban dan Kinerja DTPS'
        ]
      },
      { 
        id: 5, 
        name: 'Sarana, Prasarana, dan K3L', 
        code: 'SARPRAS',
        bobot: 7.51,
        butir: [
          '5.1 Sarana, Prasarana, dan Keselamatan Kesehatan Kerja dan Lingkungan (K3L)'
        ]
      },
      { 
        id: 6, 
        name: 'Mahasiswa dan Luaran Mahasiswa', 
        code: 'MHS',
        bobot: 26.87,
        butir: [
          '6.1 Mahasiswa dan Luaran Mahasiswa'
        ]
      },
      { 
        id: 7, 
        name: 'Sistem Penjaminan Mutu', 
        code: 'SPM',
        bobot: 15.35,
        butir: [
          '7.1 Sistem Penjaminan Mutu'
        ]
      }
    ],
    programTypes: {
      'S': { name: 'Sarjana', butirCount: 60 },
      'D1': { name: 'Diploma Satu', butirCount: 56 },
      'D2': { name: 'Diploma Dua', butirCount: 56 },
      'D3': { name: 'Diploma Tiga', butirCount: 56 },
      'STr': { name: 'Sarjana Terapan', butirCount: 64 },
      'M': { name: 'Magister', butirCount: 55 },
      'MTr': { name: 'Magister Terapan', butirCount: 58 },
      'D': { name: 'Doktor', butirCount: 53 },
      'DTr': { name: 'Doktor Terapan', butirCount: 56 },
      'PPI': { name: 'Program Profesi Insinyur', butirCount: 54 }
    }
  },

  // Upload Configuration
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
    tempDir: './uploads'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // limit each IP to 1000 requests per windowMs (increased for development)
  },

  // Database Configuration (PostgreSQL)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'akreditasi',
    user: process.env.DB_USER || 'lamtek',
    password: process.env.DB_PASSWORD || 'lamtek_secure_2025',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
  },

  // Environment
  env: process.env.NODE_ENV || 'development'
};
