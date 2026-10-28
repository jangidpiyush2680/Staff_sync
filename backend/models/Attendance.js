const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  attendanceDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, default: null },
  status: { type: String, enum: ['PRESENT', 'EXCUSED'], default: 'PRESENT' },
  correction: {
    reason: { type: String, default: '' },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    editedAt: { type: Date, default: null },
    previousCheckIn: { type: Date, default: null },
    previousCheckOut: { type: Date, default: null },
  },
}, { timestamps: true });

attendanceSchema.index({ employee: 1, attendanceDate: 1 }, { unique: true });
module.exports = mongoose.model('Attendance', attendanceSchema);
