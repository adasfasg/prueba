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

router.get(
  '/expense-report',
  authenticateToken,
  requireRole(['super_admin', 'director_ops']),
  financialsController.getExpenseCutoffReport
);

router.get(
  '/cutoff-report',
  authenticateToken,
  requireRole(['super_admin', 'director_ops']),
  financialsController.getExpenseCutoffReport
);

router.get(
  '/pms-summary',
  authenticateToken,
  requireRole(['super_admin', 'director_ops', 'director_pms']),
  financialsController.getPmsPayoutsSummary
);

router.post(
  '/pm-payout',
  authenticateToken,
  requireRole(['super_admin', 'director_ops']),
  financialsController.processPmPayout
);

router.post(
  '/transactions',
  authenticateToken,
  requireRole(['super_admin', 'director_ops']),
  financialsController.createFinancialTransaction
);

router.put(
  '/transactions/:id',
  authenticateToken,
  requireRole(['super_admin', 'director_ops']),
  financialsController.updateFinancialTransaction
);

router.delete(
  '/transactions/:id',
  authenticateToken,
  requireRole(['super_admin', 'director_ops']),
  financialsController.deleteFinancialTransaction
);

module.exports = router;
