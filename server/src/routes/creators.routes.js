const express = require('express');
const router = express.Router();
const creatorsController = require('../controllers/creators.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Authenticated private directory:
// Super Admin, Director de Creadores, PM (only their assigned creators)
router.get('/', authenticateToken, requireRole(['super_admin', 'director_ops', 'director_creators', 'pm']), creatorsController.getPrivateCreators);

// Creator evidences history
router.get('/:id/evidences', authenticateToken, requireRole(['super_admin', 'director_ops', 'director_creators', 'pm']), creatorsController.getCreatorEvidences);

// Update profile (Creator self, PM if assigned, or Admin)
router.put('/:id', authenticateToken, creatorsController.updateCreatorProfile);

module.exports = router;
