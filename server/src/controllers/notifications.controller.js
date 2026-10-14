const { db } = require('../db');

function getNotifications(req, res) {
  const userId = req.user.id;
  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY id DESC LIMIT 30
  `).all(userId);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as c FROM notifications 
    WHERE user_id = ? AND is_read = 0
  `).get(userId).c;

  return res.json({
    notifications,
    unread_count: unreadCount
  });
}

function markAsRead(req, res) {
  const userId = req.user.id;
  const notifId = req.params.id;

  if (notifId === 'all') {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  } else {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(parseInt(notifId, 10), userId);
  }

  return res.json({ success: true });
}

module.exports = {
  getNotifications,
  markAsRead
};
