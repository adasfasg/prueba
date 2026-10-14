const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');
const { authenticateToken } = require('../middleware/auth');

router.get('/dashboard', authenticateToken, metricsController.getDashboardMetrics);

module.exports = router;
