const mongoose = require('mongoose');

const attendanceSettingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'Siège' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  radius: { type: Number, default: 100 },
  workStart: { type: String, default: '09:00' },
  toleranceMinutes: { type: Number, default: 10 },
  workDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  holidays: [{
    date: { type: String, required: true },
    label: { type: String, default: '' }
  }],
  thresholds: {
    veryGood: { type: Number, default: 95 },
    satisfactory: { type: Number, default: 85 },
    watch: { type: Number, default: 70 }
  }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSettings', attendanceSettingsSchema);