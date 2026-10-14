const express = require('express');
const router = express.Router();
const serversController = require('../controllers/servers.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// All authenticated roles can access their scoped server views
router.get('/', authenticateToken, serversController.getServers);

// Creation and management: Super Admin and Director Operacional
router.post('/', authenticateToken, requireRole(['super_admin', 'director_ops']), serversController.createServer);
router.put('/:id', authenticateToken, requireRole(['super_admin', 'director_ops']), serversController.updateServer);
router.delete('/:id', authenticateToken, requireRole(['super_admin']), serversController.deleteServer);

// Assign creator to server
router.post('/:id/creators', authenticateToken, requireRole(['super_admin', 'director_ops', 'director_pms', 'director_creators', 'pm']), serversController.assignCreatorToServer);
router.delete('/:id/creators/:creatorId', authenticateToken, requireRole(['super_admin', 'director_ops', 'pm']), serversController.removeCreatorFromServer);

module.exports = router;
