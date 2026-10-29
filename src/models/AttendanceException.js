const mongoose = require('mongoose');

const attendanceExceptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['justified', 'mission'], required: true },
  reason: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String }
}, { timestamps: true });

attendanceExceptionSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceException', attendanceExceptionSchema);