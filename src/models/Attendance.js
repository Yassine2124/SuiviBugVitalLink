const mongoose = require('mongoose');

const punchFields = () => ({
  time: { type: Date },
  signatureUrl: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  accuracy: { type: Number },
  distance: { type: Number }
});

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  date: { type: String, required: true },
  isWorkingDay: { type: Boolean, default: true },
  isLate: { type: Boolean, default: false },
  lateMinutes: { type: Number, default: 0 },
  arrival: punchFields(),
  departure: punchFields()
}, { timestamps: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);