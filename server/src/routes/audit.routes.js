const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.get('/', authenticateToken, requireRole(['super_admin', 'director_ops']), auditController.getAuditLogs);

module.exports = router;
