/**
 * LAM-TEK 2025 Backend Server (Express.js)
 * Sistem Akreditasi 7 Kriteria dengan Blockchain Hyperledger Fabric
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const submissionRoutes = require('./routes/submissions');
const scoringRoutes = require('./routes/scoring');
const downloadRoutes = require('./routes/download');
const userRoutes = require('./routes/users');
const assessorRoutes = require('./routes/assessors');
const notificationRoutes = require('./routes/notifications');
const sekretariatRoutes = require('./routes/sekretariat');
const keaRoutes = require('./routes/kea');
const asesorRoutes = require('./routes/asesor');
const alScheduleRoutes = require('./routes/alSchedule');
const alExecutionRoutes = require('./routes/alExecution'); // Phase 4
const verificationRoutes = require('./routes/verification'); // Phase 5
const releaseRoutes = require('./routes/release'); // Phase 6
const traceabilityRoutes = require('./routes/traceability'); // Traceability
const documentValidationRoutes = require('./routes/documentValidation'); // UPPS doc template validation
const registrationRoutes = require('./routes/registration'); // UPPS registration
const sekretariatRegistrationRoutes = require('./routes/sekretariatRegistration'); // Sekretariat registration management
const referenceRoutes = require('./routes/reference'); // Reference data (institutions, prodi, jenjang)


// Import WebSocket
const websocketModule = require('./routes/websocket');
const websocketService = require('./services/websocketService');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(config.cors));

// Compression middleware
app.use(compression());

// Request logging with Winston
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'LAM-TEK 2025 Backend',
    version: '1.0.0',
    criteria: '7 Kriteria LAM-TEK 2025'
  });
});

// API routes
app.get(config.server.apiPrefix, (req, res) => {
  res.json({
    message: 'LAM-TEK 2025 API - 7 Kriteria Akreditasi',
    version: '1.0.0',
    criteria: config.lamtek.criteria.map(c => `${c.id}. ${c.name}`),
    endpoints: {
      health: '/health',
      auth: `${config.server.apiPrefix}/auth`,
      upload: `${config.server.apiPrefix}/upload`,
      submissions: `${config.server.apiPrefix}/submissions`,
      scoring: `${config.server.apiPrefix}/scoring`,
      download: `${config.server.apiPrefix}/download/:submissionId/:documentType`,
      alSchedule: `${config.server.apiPrefix}/al-schedule`
    }
  });
});


// Register routes
app.use(`${config.server.apiPrefix}/auth`, authRoutes);
app.use(`${config.server.apiPrefix}/upload`, uploadRoutes);
app.use(`${config.server.apiPrefix}/submissions`, submissionRoutes);
app.use(`${config.server.apiPrefix}/scoring`, scoringRoutes);
app.use(`${config.server.apiPrefix}/download`, downloadRoutes);
app.use(`${config.server.apiPrefix}/users`, userRoutes);
app.use(`${config.server.apiPrefix}/assessors`, assessorRoutes);
app.use(`${config.server.apiPrefix}/notifications`, notificationRoutes);
app.use(`${config.server.apiPrefix}/sekretariat`, sekretariatRoutes);
app.use(`${config.server.apiPrefix}/kea`, keaRoutes);
app.use(`${config.server.apiPrefix}/asesor`, asesorRoutes);
app.use(`${config.server.apiPrefix}/assessor`, asesorRoutes); // Alias for asesor
app.use(`${config.server.apiPrefix}/al-schedule`, alScheduleRoutes); // Phase 3B: AL Scheduling
app.use(`${config.server.apiPrefix}/al-execution`, alExecutionRoutes); // Phase 4: AL Execution
app.use(`${config.server.apiPrefix}/verification`, verificationRoutes); // Phase 5: Verification & Decision
app.use(`${config.server.apiPrefix}/release`, releaseRoutes); // Phase 6: Certificate Release
app.use(`${config.server.apiPrefix}/traceability`, traceabilityRoutes); // Traceability & Certificate Search
app.use(`${config.server.apiPrefix}/document-validation`, documentValidationRoutes); // UPPS document template validation
app.use(`${config.server.apiPrefix}/auth/register-upps`, registrationRoutes); // UPPS registration (public)
app.use(`${config.server.apiPrefix}/sekretariat/registrations`, sekretariatRegistrationRoutes); // Sekretariat registration management
app.use(`${config.server.apiPrefix}/reference`, referenceRoutes); // Reference data (public)

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Set connection timeout to 7 minutes (420,000 ms) for large uploads & AI analysis
server.timeout = 420000;
server.keepAliveTimeout = 420000;

// Initialize WebSocket
const wss = websocketModule.initializeWebSocket(server);
websocketService.initialize(websocketModule);

// Start server
const PORT = config.server.port;
server.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   LAM-TEK 2025 Backend Server (Express.js)              ║');
  console.log('║   7 Kriteria Akreditasi + Blockchain                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${config.server.env}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`📊 7 Kriteria LAM-TEK 2025:`);
  config.lamtek.criteria.forEach(c => {
    console.log(`   ${c.id}. ${c.name} (${c.code})`);
  });
  console.log('');
  console.log(`🔗 API Base URL: http://localhost:${PORT}${config.server.apiPrefix}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

module.exports = app;
