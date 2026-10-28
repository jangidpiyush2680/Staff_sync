const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
  message: { type: String, required: true, trim: true, minlength: 5, maxlength: 5000 },
  category: { type: String, enum: ['General', 'HR', 'Policy', 'Event', 'Holiday'], default: 'General' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
