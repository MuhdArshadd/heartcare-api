const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const verifyToken = require('../middleware/authMiddleware');

router.post('/chat', verifyToken, aiController.runConversation);
router.get('/generate-treatment', verifyToken, aiController.generateTreatment);

module.exports = router;