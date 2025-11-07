/**
 * WebSocket Route
 * Real-time updates untuk upload progress dan submission status
 */

const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const logger = require('../utils/logger');

// Store WebSocket connections
const clients = new Map();

/**
 * Initialize WebSocket server
 */
function initializeWebSocket(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws, req) => {
    // Extract user_id dari query parameter
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const userId = urlParams.get('user_id') || 'anonymous';

    logger.info(`[WebSocket] Client connected: ${userId}`);
    
    // Store connection
    clients.set(userId, ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      userId: userId,
      message: 'Connected to LAM-TEK 2025 Backend',
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        logger.info(`[WebSocket] Message from ${userId}:`, data);

        // Echo back untuk testing
        ws.send(JSON.stringify({
          type: 'echo',
          data: data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        logger.error(`[WebSocket] Error parsing message:`, error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      logger.info(`[WebSocket] Client disconnected: ${userId}`);
      clients.delete(userId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`[WebSocket] Error for ${userId}:`, error);
      clients.delete(userId);
    });

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000);
  });

  logger.info('[WebSocket] Server initialized on /ws');
  return wss;
}

/**
 * Send message to specific client
 */
function sendToClient(userId, message) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    }));
    return true;
  }
  return false;
}

/**
 * Broadcast message to all connected clients
 */
function broadcast(message) {
  let sentCount = 0;
  clients.forEach((client, userId) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
      sentCount++;
    }
  });
  logger.info(`[WebSocket] Broadcast sent to ${sentCount} clients`);
  return sentCount;
}

/**
 * Get connected clients count
 */
function getClientsCount() {
  return clients.size;
}

/**
 * Get all connected client IDs
 */
function getClientIds() {
  return Array.from(clients.keys());
}

module.exports = {
  initializeWebSocket,
  sendToClient,
  broadcast,
  getClientsCount,
  getClientIds
};
