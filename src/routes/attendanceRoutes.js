const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/attendanceSettingsController');
const { protect, isAdmin } = require('../middleware/auth');

router.get('/settings', protect, settingsController.getSettings);
router.put('/settings', protect, isAdmin, settingsController.updateSettings);

module.exports = router;