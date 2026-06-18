/**
 * Notification Controller (DB-backed)
 * Notifikasi disimpan di tabel `notifications` (persist setelah restart) dan
 * di-push real-time via WebSocket. createNotification menerima penerima berupa
 * UUID user, username, ATAU nama role (mis. 'kea' → semua user role kea).
 */

const logger = require('../utils/logger');
const { pool } = require('../config/database');
const websocketService = require('../services/websocketService');

const ROLES = ['upps', 'kea', 'asesor', 'assessor', 'sekretariat', 'admin', 'majelis'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolusi penerima → daftar { id, username, role }. */
async function resolveRecipients(recipient) {
  if (!recipient) return [];
  if (Array.isArray(recipient)) {
    const out = [];
    for (const r of recipient) out.push(...await resolveRecipients(r));
    const seen = new Set();
    return out.filter(u => (u && !seen.has(u.id)) ? seen.add(u.id) : false);
  }
  const val = String(recipient).trim();
  try {
    if (UUID_RE.test(val)) {
      const r = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [val]);
      return r.rows;
    }
    const low = val.toLowerCase();
    if (ROLES.includes(low)) {
      // 'asesor' dan 'assessor' diperlakukan sama.
      const roles = (low === 'asesor' || low === 'assessor') ? ['asesor', 'assessor'] : [low];
      const r = await pool.query('SELECT id, username, role FROM users WHERE role = ANY($1) AND is_active = TRUE', [roles]);
      return r.rows;
    }
    const r = await pool.query('SELECT id, username, role FROM users WHERE username = $1', [val]);
    return r.rows;
  } catch (e) {
    logger.warn(`[Notif] resolveRecipients gagal untuk "${val}": ${e.message}`);
    return [];
  }
}

/**
 * Buat notifikasi (internal). Non-fatal.
 * @param {string|string[]} recipient UUID / username / role / array
 * @param {object} metadata mis. { action:'download_surat_tugas', submissionId, downloadUrl }
 */
async function createNotification(recipient, title, message, type = 'info', metadata = {}) {
  try {
    const users = await resolveRecipients(recipient);
    if (!users.length) {
      logger.warn(`[Notif] Tidak ada penerima untuk "${recipient}" (judul: ${title})`);
      return null;
    }
    let last = null;
    for (const u of users) {
      const ins = await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_submission_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [u.id, title, message, type, metadata.submissionId || null, JSON.stringify(metadata)]
      );
      last = {
        id: ins.rows[0].id,
        title, message, type,
        isRead: false,
        createdAt: ins.rows[0].created_at,
        relatedSubmissionId: metadata.submissionId || null,
        metadata
      };
      // Push real-time (best-effort, by username)
      try { websocketService.sendNotification(u.username, last); } catch (_) { /* ignore */ }
    }
    logger.info(`[Notif] "${title}" dikirim ke ${users.length} user`);
    return last;
  } catch (e) {
    logger.warn(`[Notif] createNotification gagal (non-fatal): ${e.message}`);
    return null;
  }
}

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read,
    createdAt: row.created_at,
    relatedSubmissionId: row.related_submission_id,
    metadata: row.metadata || {}
  };
}

/** GET /api/v1/notifications */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [userId]
    );
    res.json(result.rows.map(mapRow));
  } catch (error) {
    logger.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications', message: error.message });
  }
};

/** PUT /api/v1/notifications/:id/read */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read', message: error.message });
  }
};

/** PUT /api/v1/notifications/read-all */
exports.markAllAsRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read', message: error.message });
  }
};

/** DELETE /api/v1/notifications/:id */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification', message: error.message });
  }
};

exports.createNotification = createNotification;
exports.resolveRecipients = resolveRecipients;
