const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, protectSuperAdmin } = require('../middleware/rbac');

// Super Admin exclusive endpoints
router.get('/', authenticateToken, requireRole(['super_admin', 'director_ops']), usersController.getUsers);
router.post('/', authenticateToken, requireRole(['super_admin']), usersController.createUser);
router.put('/:id', authenticateToken, requireRole(['super_admin']), protectSuperAdmin, usersController.updateUser);
router.delete('/:id', authenticateToken, requireRole(['super_admin']), protectSuperAdmin, usersController.deleteUser);

module.exports = router;
