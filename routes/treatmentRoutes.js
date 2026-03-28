const express = require('express');
const router = express.Router();
const treatmentController = require('../controllers/treatmentController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/add', verifyToken, treatmentController.addTreatment);
router.get('/', verifyToken, treatmentController.getTreatments); // Uses query params
router.post('/log', verifyToken, treatmentController.logTreatment);
router.put('/stop', verifyToken, treatmentController.stopTreatment);
router.get('/active-timelines', verifyToken, treatmentController.getActiveTimelines);

module.exports = router;