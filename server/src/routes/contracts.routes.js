const express = require('express');
const router = express.Router();
const contractsController = require('../controllers/contracts.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Scoped contracts list & detail for all authenticated roles
router.get('/', authenticateToken, contractsController.getContracts);
router.get('/:id', authenticateToken, contractsController.getContractById);

// Create contract: Super Admin & Director Ops
router.post('/', authenticateToken, requireRole(['super_admin', 'director_ops']), contractsController.createContract);

// Update contract: Super Admin & Director Ops
router.put('/:id', authenticateToken, requireRole(['super_admin', 'director_ops']), contractsController.updateContract);

// Delete contract: Super Admin
router.delete('/:id', authenticateToken, requireRole(['super_admin']), contractsController.deleteContract);

// Record payment to contract: Super Admin only
router.post('/:id/pay', authenticateToken, requireRole(['super_admin']), contractsController.recordContractPayment);

module.exports = router;
