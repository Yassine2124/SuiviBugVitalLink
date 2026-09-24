const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/pending', protect, isAdmin, authController.getPendingUsers);
router.put('/approve/:id', protect, isAdmin, authController.approveUser);

module.exports = router;