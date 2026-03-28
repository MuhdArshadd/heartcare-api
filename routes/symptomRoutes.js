const express = require('express');
const router = express.Router();
const symptomController = require('../controllers/symptomController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/add', verifyToken, symptomController.addSymptom);
router.get('/user', verifyToken, symptomController.getUserSymptoms);
router.post('/log', verifyToken, symptomController.addSymptomLog);
router.get('/logs', verifyToken, symptomController.getSymptomLogs);
router.get('/weekly-averages/:userSymptomId', verifyToken, symptomController.getWeeklyAverages);
router.put('/status', verifyToken, symptomController.updateSymptomStatus);

module.exports = router;