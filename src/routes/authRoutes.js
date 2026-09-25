const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/pending', protect, isAdmin, authController.getPendingUsers);
router.get('/users', protect, isAdmin, authController.getAllUsers);
router.put('/approve/:id', protect, isAdmin, authController.approveUser);
router.put('/permissions/:id', protect, isAdmin, authController.updatePermissions);

module.exports = router;