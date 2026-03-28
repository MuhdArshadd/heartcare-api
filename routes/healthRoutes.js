const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const verifyToken = require('../middleware/authMiddleware'); // Import the bouncer

// The verifyToken middleware runs FIRST. If it fails, the controller never fires.
router.post('/risk-factors', verifyToken, healthController.updateRiskFactors);
router.get('/dashboard-stats', verifyToken, healthController.getDashboardStats);
router.post('/cvd-result', verifyToken, healthController.updateCVDResult);
router.get('/risks', verifyToken, healthController.getCVDPresence);
router.get('/active-symptoms', verifyToken, healthController.getActiveSymptoms);
router.get('/readings', verifyToken, healthController.getHealthReadings);

module.exports = router;