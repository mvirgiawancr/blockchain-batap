/**
 * WebSocket Route
 * Real-time updates untuk upload progress dan submission status.
 *
 * Perbaikan sinkronisasi:
 *  - Registry per-user memakai Set<ws> (mendukung banyak tab/koneksi) sehingga
 *    saat reconnect, menutup koneksi LAMA tidak menghapus koneksi BARU (race fix).
 *  - Ping/pong liveness: koneksi mati/half-open dideteksi & di-terminate, lalu
 *    frontend otomatis reconnect — bukan diam-diam mengirim ke void.
 */

const WebSocket = require('ws');
const logger = require('../utils/logger');

// userId -> Set<ws>
const clients = new Map();

function addClient(userId, ws) {
  let set = clients.get(userId);
  if (!set) { set = new Set(); clients.set(userId, set); }
  set.add(ws);
}

function removeClient(userId, ws) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) clients.delete(userId);
}

/**
 * Initialize WebSocket server
 */
function initializeWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams((req.url.split('?')[1]) || '');
    const userId = urlParams.get('user_id') || 'anonymous';
    ws.userId = userId;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; }); // balasan pong otomatis dari browser

    addClient(userId, ws);
    logger.info(`[WebSocket] Client connected: ${userId} (koneksi user ini: ${clients.get(userId).size})`);

    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      userId,
      message: 'Connected to LAM-TEK 2025 Backend',
      timestamp: new Date().toISOString()
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        // Dukung ping aplikasi dari klien (opsional): balas pong.
        if (data && data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (error) {
        logger.error('[WebSocket] Error parsing message:', error.message);
      }
    });

    ws.on('close', () => {
      removeClient(userId, ws); // hanya hapus koneksi INI, bukan key user
      logger.info(`[WebSocket] Client disconnected: ${userId}`);
    });

    ws.on('error', (error) => {
      logger.error(`[WebSocket] Error for ${userId}:`, error.message);
      removeClient(userId, ws);
      try { ws.terminate(); } catch (_) { /* ignore */ }
    });
  });

  // Liveness: ping semua klien tiap 30s; yang tidak membalas pong (mati/half-open)
  // di-terminate agar tidak menerima kiriman ke void dan agar klien reconnect.
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch (_) { /* ignore */ }
        return;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch (_) { /* ignore */ }
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  logger.info('[WebSocket] Server initialized on /ws (Set per-user + ping/pong liveness)');
  return wss;
}

/**
 * Send message to ALL connections of a specific user.
 * @returns {boolean} true bila terkirim ke minimal satu koneksi OPEN.
 */
function sendToClient(userId, message) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return false;
  const payload = JSON.stringify({ ...message, timestamp: new Date().toISOString() });
  let sent = 0;
  set.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) { ws.send(payload); sent++; }
  });
  return sent > 0;
}

/**
 * Broadcast message to all connected clients
 */
function broadcast(message) {
  const payload = JSON.stringify({ ...message, timestamp: new Date().toISOString() });
  let sentCount = 0;
  clients.forEach((set) => {
    set.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) { ws.send(payload); sentCount++; }
    });
  });
  logger.info(`[WebSocket] Broadcast sent to ${sentCount} clients`);
  return sentCount;
}

function getClientsCount() {
  let n = 0;
  clients.forEach((set) => { n += set.size; });
  return n;
}

function getClientIds() {
  return Array.from(clients.keys());
}

module.exports = {
  initializeWebSocket,
  sendToClient,
  broadcast,
  getClientsCount,
  getClientIds,
  // diekspos untuk unit test
  _clients: clients,
  _addClient: addClient,
  _removeClient: removeClient
};
