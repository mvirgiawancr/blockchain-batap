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
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
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
    mspId: process.env.FABRIC_MSP_ID || 'sekretariatMSP',
    walletPath: process.env.FABRIC_WALLET_PATH || './wallet',
    connectionProfile: process.env.FABRIC_CONNECTION_PROFILE || '../fablo-target/fabric-config/connection-profiles/connection-profile-sekretariat.json'
  },

  // LAM-TEK 2025 Configuration
  lamtek: {
    criteriaCount: 7,
    criteria: [
      { id: 1, name: 'Diferensiasi Misi', code: 'DM' },
      { id: 2, name: 'Akuntabilitas', code: 'AK' },
      { id: 3, name: 'Relevansi Pendidikan, Penelitian, dan PkM', code: 'REL' },
      { id: 4, name: 'Sumber Daya Manusia', code: 'SDM' },
      { id: 5, name: 'Sarana, Prasarana, dan K3L', code: 'SARPRAS' },
      { id: 6, name: 'Mahasiswa dan Luaran Mahasiswa', code: 'MHS' },
      { id: 7, name: 'Sistem Penjaminan Mutu', code: 'SPM' }
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
    max: 100 // limit each IP to 100 requests per windowMs
  }
};
