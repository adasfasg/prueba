const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Public creator catalog - strictly sanitized, no private rates
router.get('/creators', publicController.getPublicCreators);
router.get('/stats', publicController.getPublicStats);
router.post('/contact', publicController.submitContact);

module.exports = router;
