const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, trim: true, unique: true, uppercase: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  address: { type: String, trim: true, maxlength: 250, default: '' },
  department: { type: String, trim: true, maxlength: 80, default: 'General', index: true },
  designation: { type: String, trim: true, maxlength: 80, default: 'Employee' },
  joiningDate: { type: String, default: '' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  employmentStatus: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
}, { timestamps: true });

employeeSchema.index({ manager: 1, employmentStatus: 1 });
module.exports = mongoose.model('Employee', employeeSchema);
