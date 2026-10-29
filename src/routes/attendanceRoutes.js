const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/attendanceSettingsController');
const attendanceController = require('../controllers/attendanceController');
const reportController = require('../controllers/attendanceReportController');
const { protect, isAdmin } = require('../middleware/auth');

router.get('/settings', protect, settingsController.getSettings);
router.put('/settings', protect, isAdmin, settingsController.updateSettings);

router.get('/today', protect, attendanceController.getToday);
router.get('/mine', protect, attendanceController.getMine);
router.post('/clock-in', protect, attendanceController.clockIn);
router.post('/clock-out', protect, attendanceController.clockOut);

router.get('/report', protect, isAdmin, reportController.getReport);
router.put('/exceptions', protect, isAdmin, reportController.upsertException);
router.delete('/exceptions/:id', protect, isAdmin, reportController.deleteException);

module.exports = router;