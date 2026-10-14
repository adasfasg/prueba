const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notifications.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, notifController.getNotifications);
router.put('/:id/read', authenticateToken, notifController.markAsRead);

module.exports = router;
