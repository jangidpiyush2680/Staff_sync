const Training = require('../models/Training');
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { isDateKey } = require('../utils/date');

function visibleTrainingQuery(user, profile) {
  if (user.role === 'HR') return {};
  if (user.role === 'MANAGER') return { $or: [{ teamManager: user._id }, { teamManager: null }] };
  return { $or: [{ teamManager: null }, { teamManager: profile?.manager || null }] };
}

exports.listTrainings = asyncHandler(async (req, res) => {
  const profile = await Employee.findOne({ user: req.user._id });
  const query = visibleTrainingQuery(req.user, profile);
  if (req.query.status && ['ACTIVE', 'CANCELLED', 'COMPLETED'].includes(req.query.status)) query.status = req.query.status;
  const items = await Training.find(query).populate('createdBy', 'name role').populate('teamManager', 'name').sort({ startDate: 1 }).limit(100);
  res.json({ items });
});

exports.createTraining = asyncHandler(async (req, res) => {
  const { title, description, trainer = '', startDate, endDate = '', mode = 'Online', location = '', status = 'ACTIVE' } = req.body;
  if (!title || String(title).trim().length < 3) throw new AppError('Title must contain at least 3 characters.', 400);
  if (!description || String(description).trim().length < 5) throw new AppError('Description must contain at least 5 characters.', 400);
  if (!isDateKey(startDate)) throw new AppError('A valid start date is required.', 400);
  if (endDate && (!isDateKey(endDate) || endDate < startDate)) throw new AppError('End date must be valid and not before the start date.', 400);
  if (!['Online', 'In person', 'Hybrid'].includes(mode)) throw new AppError('Choose a valid training mode.', 400);
  if (!['ACTIVE', 'CANCELLED', 'COMPLETED'].includes(status)) throw new AppError('Choose a valid status.', 400);
  const item = await Training.create({ title, description, trainer, startDate, endDate, mode, location, status, createdBy: req.user._id, teamManager: req.user.role === 'MANAGER' ? req.user._id : null });
  res.status(201).json({ training: await item.populate('createdBy', 'name role'), message: 'Training program created.' });
});

exports.updateTraining = asyncHandler(async (req, res) => {
  const item = await Training.findById(req.params.id);
  if (!item) throw new AppError('Training program not found.', 404);
  if (req.user.role === 'MANAGER' && String(item.createdBy) !== String(req.user._id)) throw new AppError('You can only edit training programs you created.', 403);
  const fields = ['title', 'description', 'trainer', 'startDate', 'endDate', 'mode', 'location', 'status'];
  for (const field of fields) if (req.body[field] !== undefined) item[field] = req.body[field];
  if (!item.title || item.title.trim().length < 3 || !item.description || item.description.trim().length < 5) throw new AppError('Provide a valid title and description.', 400);
  if (!isDateKey(item.startDate) || (item.endDate && (!isDateKey(item.endDate) || item.endDate < item.startDate))) throw new AppError('Training dates are invalid.', 400);
  await item.save();
  res.json({ training: await item.populate('createdBy', 'name role'), message: 'Training program updated.' });
});

exports.enroll = asyncHandler(async (req, res) => {
  const profile = await Employee.findOne({ user: req.user._id, employmentStatus: 'ACTIVE' });
  if (!profile) throw new AppError('An active employee profile is required to enroll.', 403);
  const training = await Training.findById(req.params.id);
  if (!training || training.status !== 'ACTIVE') throw new AppError('This training program is not available for enrollment.', 404);
  const allowed = !training.teamManager || (req.user.role === 'EMPLOYEE' && String(training.teamManager) === String(profile.manager)) || (req.user.role === 'MANAGER' && String(training.teamManager) === String(req.user._id));
  if (!allowed) throw new AppError('This training program is not available to your account.', 403);
  const existing = training.enrollments.find((item) => String(item.employee) === String(profile._id));
  if (existing) throw new AppError('You are already enrolled in this program.', 409);
  training.enrollments.push({ employee: profile._id, status: 'ENROLLED' });
  await training.save();
  res.status(201).json({ message: 'You have enrolled in this training program.' });
});

exports.completeTraining = asyncHandler(async (req, res) => {
  const profile = await Employee.findOne({ user: req.user._id });
  const training = await Training.findById(req.params.id);
  if (!profile || !training) throw new AppError('Training program or employee profile not found.', 404);
  const enrollment = training.enrollments.find((item) => String(item.employee) === String(profile._id));
  if (!enrollment) throw new AppError('Enroll in this program before marking it completed.', 400);
  enrollment.status = 'COMPLETED';
  await training.save();
  res.json({ message: 'Training completion recorded.' });
});
