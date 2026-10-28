const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  status: { type: String, enum: ['ENROLLED', 'COMPLETED'], default: 'ENROLLED' },
  enrolledAt: { type: Date, default: Date.now },
}, { _id: false });

const trainingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
  description: { type: String, required: true, trim: true, minlength: 5, maxlength: 3000 },
  trainer: { type: String, trim: true, maxlength: 120, default: '' },
  startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endDate: { type: String, default: '', match: /^$|^\d{4}-\d{2}-\d{2}$/ },
  mode: { type: String, enum: ['Online', 'In person', 'Hybrid'], default: 'Online' },
  location: { type: String, trim: true, maxlength: 200, default: '' },
  status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'COMPLETED'], default: 'ACTIVE' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  enrollments: { type: [enrollmentSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Training', trainingSchema);
