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
const uploadRoutes = require('./routes/upload');
const submissionRoutes = require('./routes/submissions');
const scoringRoutes = require('./routes/scoring');
const downloadRoutes = require('./routes/download');

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
      upload: `${config.server.apiPrefix}/upload`,
      submissions: `${config.server.apiPrefix}/submissions`,
      scoring: `${config.server.apiPrefix}/scoring`,
      download: `${config.server.apiPrefix}/download/:submissionId/:documentType`
    }
  });
});

// Register routes
app.use(`${config.server.apiPrefix}/upload`, uploadRoutes);
app.use(`${config.server.apiPrefix}/submissions`, submissionRoutes);
app.use(`${config.server.apiPrefix}/scoring`, scoringRoutes);
app.use(`${config.server.apiPrefix}/download`, downloadRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Create HTTP server for WebSocket support
const server = http.createServer(app);

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
