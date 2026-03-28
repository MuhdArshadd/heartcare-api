const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const verifyToken = require('../middleware/authMiddleware');

// Route to trigger a push notification to another user
router.post('/poke', verifyToken, notificationController.sendFamilyPoke);

module.exports = router;