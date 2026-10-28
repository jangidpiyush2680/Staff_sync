const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  leaveType: { type: String, enum: ['Casual Leave', 'Sick Leave', 'Earned Leave'], required: true },
  startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  decisionComment: { type: String, default: '', maxlength: 1000 },
  decisionDate: { type: Date, default: null },
}, { timestamps: true });

leaveRequestSchema.index({ employee: 1, status: 1, startDate: 1 });
module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
