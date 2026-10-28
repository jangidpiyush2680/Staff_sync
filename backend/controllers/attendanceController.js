const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const User = require('../models/User');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { getDateKey, isDateKey } = require('../utils/date');
const { safePage, safeLimit, validateAttendanceTimes } = require('../utils/validators');

function populateAttendance(query) {
  return query.populate({ path: 'employee', populate: { path: 'user', select: 'name email role' } }).populate('correction.editedBy', 'name role');
}

exports.listAttendance = asyncHandler(async (req, res) => {
  const page = safePage(req.query.page);
  const limit = safeLimit(req.query.limit, 15);
  const query = {};
  if (req.query.date) {
    if (!isDateKey(req.query.date)) throw new AppError('Use a valid date in YYYY-MM-DD format.', 400);
    query.attendanceDate = req.query.date;
  }
  if (req.query.employee) {
    const term = String(req.query.employee).trim().slice(0, 100);
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (mongoose.Types.ObjectId.isValid(term)) query.employee = term;
    else {
      const matchedUsers = await User.find({ name: { $regex: escapedTerm, $options: 'i' } }).select('_id');
      const profiles = await Employee.find({ $or: [
        { employeeId: { $regex: escapedTerm, $options: 'i' } },
        { user: { $in: matchedUsers.map((item) => item._id) } },
      ] }).select('_id');
      query.employee = { $in: profiles.map((profile) => profile._id) };
    }
  }

  if (req.user.role !== 'HR') {
    const profiles = await Employee.find(req.user.role === 'MANAGER' ? { manager: req.user._id } : { user: req.user._id }).select('_id');
    query.employee = { $in: profiles.map((profile) => profile._id) };
  }
  const total = await Attendance.countDocuments(query);
  const items = await populateAttendance(Attendance.find(query).sort({ attendanceDate: -1, checkIn: -1 }).skip((page - 1) * limit).limit(limit));
  res.json({ items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
});

exports.checkIn = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id, employmentStatus: 'ACTIVE' });
  if (!employee) throw new AppError('An active employee profile is required to mark attendance.', 403);
  const attendanceDate = getDateKey(new Date());
  const existing = await Attendance.findOne({ employee: employee._id, attendanceDate });
  if (existing) throw new AppError('You have already checked in today.', 409);
  try {
    const attendance = await Attendance.create({ employee: employee._id, attendanceDate, checkIn: new Date(), status: 'PRESENT' });
    res.status(201).json({ attendance, message: 'Check-in recorded successfully.' });
  } catch (error) {
    if (error.code === 11000) throw new AppError('You have already checked in today.', 409);
    throw error;
  }
});

exports.checkOut = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id, employmentStatus: 'ACTIVE' });
  if (!employee) throw new AppError('An active employee profile is required to mark attendance.', 403);
  const attendanceDate = getDateKey(new Date());
  const attendance = await Attendance.findOne({ employee: employee._id, attendanceDate });
  if (!attendance) throw new AppError('Check in before checking out.', 400);
  if (attendance.checkOut) throw new AppError('You have already checked out today.', 409);
  const checkOut = new Date();
  const invalid = validateAttendanceTimes(attendance.checkIn, checkOut);
  if (invalid) throw new AppError(invalid, 400);
  attendance.checkOut = checkOut;
  await attendance.save();
  res.json({ attendance, message: 'Check-out recorded successfully.' });
});

exports.correctAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) throw new AppError('Attendance record not found.', 404);
  const nextCheckIn = req.body.checkIn !== undefined ? req.body.checkIn : attendance.checkIn;
  const nextCheckOut = req.body.checkOut !== undefined ? (req.body.checkOut || null) : attendance.checkOut;
  const invalid = validateAttendanceTimes(nextCheckIn, nextCheckOut);
  if (invalid) throw new AppError(invalid, 400);
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 5) throw new AppError('Please provide a correction reason of at least 5 characters.', 400);
  attendance.correction = {
    reason,
    editedBy: req.user._id,
    editedAt: new Date(),
    previousCheckIn: attendance.checkIn,
    previousCheckOut: attendance.checkOut,
  };
  attendance.checkIn = new Date(nextCheckIn);
  attendance.checkOut = nextCheckOut ? new Date(nextCheckOut) : null;
  if (req.body.status !== undefined) {
    if (!['PRESENT', 'EXCUSED'].includes(req.body.status)) throw new AppError('Invalid attendance status.', 400);
    attendance.status = req.body.status;
  }
  await attendance.save();
  res.json({ attendance: await populateAttendance(Attendance.findById(attendance._id)), message: 'Attendance correction saved.' });
});
