/**
 * Notification Controller
 * Handles notification operations
 */

const logger = require('../utils/logger');

// Temporary in-memory storage (should be replaced with database)
let notifications = [
  {
    id: 'notif_001',
    userId: 'upps_tip',
    title: 'Submission Disetujui',
    message: 'Submission Anda untuk program Teknik Informatika telah disetujui oleh Sekretariat',
    type: 'success',
    isRead: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'notif_002',
    userId: 'upps_tip',
    title: 'Asesor Ditugaskan',
    message: 'Asesor telah ditugaskan untuk melakukan penilaian terhadap submission Anda',
    type: 'info',
    isRead: false,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

/**
 * Get notifications for current user
 * GET /api/v1/notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.username;

    // Filter notifications for current user
    const userNotifications = notifications.filter(n => n.userId === userId);

    logger.info(`Retrieved ${userNotifications.length} notifications for user ${userId}`);
    res.json(userNotifications);
  } catch (error) {
    logger.error('Error getting notifications:', error);
    res.status(500).json({
      error: 'Failed to retrieve notifications',
      message: error.message
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/v1/notifications/:id/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.username;

    const notification = notifications.find(n => n.id === id && n.userId === userId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.isRead = true;

    logger.info(`Notification ${id} marked as read by user ${userId}`);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/read-all
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.username;

    notifications.forEach(n => {
      if (n.userId === userId) {
        n.isRead = true;
      }
    });

    logger.info(`All notifications marked as read for user ${userId}`);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
};

/**
 * Delete notification
 * DELETE /api/v1/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.username;

    const index = notifications.findIndex(n => n.id === id && n.userId === userId);

    if (index === -1) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notifications.splice(index, 1);

    logger.info(`Notification ${id} deleted by user ${userId}`);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      message: error.message
    });
  }
};

/**
 * Create notification (internal use)
 */
exports.createNotification = (userId, title, message, type = 'info') => {
  const notification = {
    id: `notif_${Date.now()}`,
    userId,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  notifications.push(notification);
  logger.info(`Notification created for user ${userId}: ${title}`);

  return notification;
};
