const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/complete', verifyToken, profileController.updateProfile);
router.put('/update', verifyToken, profileController.updateProfile);
router.post('/location', verifyToken, profileController.updateLocation);
router.post('/update-token', verifyToken, profileController.updateFcmToken);

module.exports = router;