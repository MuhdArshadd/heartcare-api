const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/', verifyToken, familyController.getFamily);
router.post('/manage', verifyToken, familyController.manageFamily);

module.exports = router;