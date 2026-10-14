const express = require('express');
const router = express.Router();
const campaignsController = require('../controllers/campaigns.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Scoped get campaigns for all authenticated roles
router.get('/', authenticateToken, campaignsController.getCampaigns);

// Create campaign: Super Admin, Director Operacional, PM
router.post('/', authenticateToken, requireRole(['super_admin', 'director_ops', 'pm']), campaignsController.createCampaign);

// Update campaign
router.put('/:id', authenticateToken, requireRole(['super_admin', 'director_ops', 'pm']), campaignsController.updateCampaign);

// Assign / remove creators
router.post('/:id/creators', authenticateToken, requireRole(['super_admin', 'director_ops', 'pm']), campaignsController.assignCreatorToCampaign);
router.delete('/:id/creators/:creatorId', authenticateToken, requireRole(['super_admin', 'director_ops', 'pm']), campaignsController.removeCreatorFromCampaign);

module.exports = router;
