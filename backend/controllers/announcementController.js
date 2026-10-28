const Announcement = require('../models/Announcement');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');

exports.listAnnouncements = asyncHandler(async (req, res) => {
  const items = await Announcement.find({ publishedAt: { $lte: new Date() } }).populate('createdBy', 'name role').sort({ publishedAt: -1 }).limit(100);
  res.json({ items });
});

exports.createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, category = 'General' } = req.body;
  if (!title || String(title).trim().length < 3) throw new AppError('Title must contain at least 3 characters.', 400);
  if (!message || String(message).trim().length < 5) throw new AppError('Message must contain at least 5 characters.', 400);
  if (!['General', 'HR', 'Policy', 'Event', 'Holiday'].includes(category)) throw new AppError('Choose a valid category.', 400);
  const item = await Announcement.create({ title: String(title).trim(), message: String(message).trim(), category, createdBy: req.user._id, publishedAt: req.body.publishedAt || new Date() });
  res.status(201).json({ announcement: await item.populate('createdBy', 'name role'), message: 'Announcement published.' });
});

exports.updateAnnouncement = asyncHandler(async (req, res) => {
  const item = await Announcement.findById(req.params.id);
  if (!item) throw new AppError('Announcement not found.', 404);
  const { title, message, category, publishedAt } = req.body;
  if (title !== undefined) {
    if (String(title).trim().length < 3) throw new AppError('Title must contain at least 3 characters.', 400);
    item.title = String(title).trim();
  }
  if (message !== undefined) {
    if (String(message).trim().length < 5) throw new AppError('Message must contain at least 5 characters.', 400);
    item.message = String(message).trim();
  }
  if (category !== undefined) {
    if (!['General', 'HR', 'Policy', 'Event', 'Holiday'].includes(category)) throw new AppError('Choose a valid category.', 400);
    item.category = category;
  }
  if (publishedAt !== undefined) item.publishedAt = new Date(publishedAt);
  await item.save();
  res.json({ announcement: await item.populate('createdBy', 'name role'), message: 'Announcement updated.' });
});

exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  const deleted = await Announcement.findByIdAndDelete(req.params.id);
  if (!deleted) throw new AppError('Announcement not found.', 404);
  res.json({ message: 'Announcement deleted.' });
});
