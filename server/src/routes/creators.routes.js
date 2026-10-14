const express = require('express');
const router = express.Router();
const creatorsController = require('../controllers/creators.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Authenticated private directory:
// Super Admin, Director de Creadores, PM (only their assigned creators)
router.get('/', authenticateToken, requireRole(['super_admin', 'director_ops', 'director_creators', 'pm']), creatorsController.getPrivateCreators);

// Update profile (Creator self or Admin)
router.put('/:id', authenticateToken, creatorsController.updateCreatorProfile);

module.exports = router;
