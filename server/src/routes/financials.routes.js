const express = require('express');
const router = express.Router();
const financialsController = require('../controllers/financials.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// All financials endpoints are restricted to Super Admin (and operations directors)
router.get(
  '/servers',
  authenticateToken,
  requireRole(['super_admin', 'director_ops']),
  financialsController.getServerFinancialReport
);

router.post(
  '/transactions',
  authenticateToken,
  requireRole(['super_admin', 'director_ops']),
  financialsController.createFinancialTransaction
);

router.delete(
  '/transactions/:id',
  authenticateToken,
  requireRole(['super_admin']),
  financialsController.deleteFinancialTransaction
);

module.exports = router;
