const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const verifyToken = require('../middleware/authMiddleware');

// Only one route needed!
router.post('/analyze', verifyToken, predictionController.saveDiagnosis);

module.exports = router;