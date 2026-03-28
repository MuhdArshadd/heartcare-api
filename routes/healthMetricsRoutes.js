const express = require('express');
const router = express.Router();
const healthMetricsController = require('../controllers/healthMetricsController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/update', verifyToken, healthMetricsController.updateMetrics);

module.exports = router;