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

// Suspender / Reactivar o Eliminar Servidor: EXCLUSIVO Super Admin
router.put('/:id/status', authenticateToken, requireRole(['super_admin']), serversController.toggleServerStatus);
router.delete('/:id', authenticateToken, requireRole(['super_admin']), serversController.deleteServer);

// Assign creator to server - Restricted strictly to Administrator
router.post('/:id/creators', authenticateToken, requireRole(['super_admin', 'director_ops']), serversController.assignCreatorToServer);
router.delete('/:id/creators/:creatorId', authenticateToken, requireRole(['super_admin', 'director_ops']), serversController.removeCreatorFromServer);

module.exports = router;
