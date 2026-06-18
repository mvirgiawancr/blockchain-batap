/**
 * WebSocket Service
 * Mengirim real-time updates ke clients
 */

const logger = require('../utils/logger');

// Will be initialized dari server.js
let websocketModule = null;

/**
 * Initialize WebSocket module reference
 */
function initialize(wsModule) {
  websocketModule = wsModule;
  logger.info('[WebSocketService] Initialized');
}

/**
 * Send upload progress update
 */
function sendUploadProgress(userId, data) {
  if (!websocketModule) {
    logger.warn('[WebSocketService] Not initialized');
    return false;
  }

  return websocketModule.sendToClient(userId, {
    type: 'upload_progress',
    data: {
      stage: data.stage,
      progress: data.progress,
      message: data.message,
      details: data.details
    }
  });
}

/**
 * Send analysis progress update
 */
function sendAnalysisProgress(userId, data) {
  if (!websocketModule) {
    logger.warn('[WebSocketService] Not initialized');
    return false;
  }

  return websocketModule.sendToClient(userId, {
    type: 'analysis_progress',
    data: {
      stage: data.stage,
      criterion: data.criterion,
      progress: data.progress,
      message: data.message
    }
  });
}

/**
 * Send scoring update
 */
function sendScoringUpdate(userId, data) {
  if (!websocketModule) {
    logger.warn('[WebSocketService] Not initialized');
    return false;
  }

  return websocketModule.sendToClient(userId, {
    type: 'scoring_update',
    data: {
      submissionId: data.submissionId,
      criteriaScores: data.criteriaScores,
      finalScore: data.finalScore,
      akreditasi: data.akreditasi
    }
  });
}

/**
 * Send error notification
 */
function sendError(userId, error) {
  if (!websocketModule) {
    logger.warn('[WebSocketService] Not initialized');
    return false;
  }

  return websocketModule.sendToClient(userId, {
    type: 'error',
    error: {
      message: error.message,
      code: error.code,
      details: error.details
    }
  });
}

/**
 * Send success notification
 */
function sendSuccess(userId, data) {
  if (!websocketModule) {
    logger.warn('[WebSocketService] Not initialized');
    return false;
  }

  return websocketModule.sendToClient(userId, {
    type: 'success',
    data: data
  });
}

/**
 * Broadcast announcement to all clients
 */
function broadcastAnnouncement(message) {
  if (!websocketModule) {
    logger.warn('[WebSocketService] Not initialized');
    return 0;
  }

  return websocketModule.broadcast({
    type: 'announcement',
    message: message
  });
}

/**
 * Get connected clients info
 */
function getConnectionStats() {
  if (!websocketModule) {
    return { count: 0, clients: [] };
  }

  return {
    count: websocketModule.getClientsCount(),
    clients: websocketModule.getClientIds()
  };
}

/**
 * Send a generic notification to a user (push real-time).
 */
function sendNotification(userId, data) {
  if (!websocketModule) {
    logger.warn('[WebSocketService] Not initialized');
    return false;
  }
  return websocketModule.sendToClient(userId, { type: 'notification', data });
}

module.exports = {
  initialize,
  sendNotification,
  sendUploadProgress,
  sendAnalysisProgress,
  sendScoringUpdate,
  sendError,
  sendSuccess,
  broadcastAnnouncement,
  getConnectionStats
};
