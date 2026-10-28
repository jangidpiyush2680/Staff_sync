const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { validateLeaveInput, safePage, safeLimit } = require('../utils/validators');

function populateLeave(query) {
  return query.populate({ path: 'employee', populate: [{ path: 'user', select: 'name email role' }, { path: 'manager', select: 'name' }] }).populate('reviewer', 'name role');
}

exports.listLeaves = asyncHandler(async (req, res) => {
  const page = safePage(req.query.page);
  const limit = safeLimit(req.query.limit, 15);
  const query = {};
  if (req.query.status && ['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status)) query.status = req.query.status;

  if (req.user.role === 'EMPLOYEE') {
    const profile = await Employee.findOne({ user: req.user._id });
    query.employee = profile?._id || null;
  } else if (req.user.role === 'MANAGER') {
    const profiles = await Employee.find({ manager: req.user._id }).select('_id');
    query.employee = { $in: profiles.map((profile) => profile._id) };
  }

  const total = await LeaveRequest.countDocuments(query);
  const items = await populateLeave(LeaveRequest.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit));
  res.json({ items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
});

exports.createLeave = asyncHandler(async (req, res) => {
  const inputError = validateLeaveInput(req.body);
  if (inputError) throw new AppError(inputError, 400);
  const employee = await Employee.findOne({ user: req.user._id, employmentStatus: 'ACTIVE' });
  if (!employee) throw new AppError('An active employee profile is required to request leave.', 403);
  const existing = await LeaveRequest.findOne({ employee: employee._id, status: 'PENDING', startDate: req.body.startDate, endDate: req.body.endDate, leaveType: req.body.leaveType });
  if (existing) throw new AppError('A matching pending leave request already exists.', 409);
  const leave = await LeaveRequest.create({ employee: employee._id, leaveType: req.body.leaveType, startDate: req.body.startDate, endDate: req.body.endDate, reason: String(req.body.reason).trim() });
  res.status(201).json({ leave: await populateLeave(LeaveRequest.findById(leave._id)), message: 'Leave request submitted.' });
});

exports.decideLeave = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findById(req.params.id).populate('employee');
  if (!leave) throw new AppError('Leave request not found.', 404);
  if (leave.status !== 'PENDING') throw new AppError('This leave request has already been processed.', 409);
  if (req.user.role === 'MANAGER') {
    const profile = await Employee.findById(leave.employee._id);
    if (!profile || String(profile.manager || '') !== String(req.user._id)) throw new AppError('You can only review leave from your assigned team.', 403);
    if (String(profile.user) === String(req.user._id)) throw new AppError('You cannot approve your own leave request.', 403);
  } else if (req.user.role !== 'HR') {
    throw new AppError('Employees cannot approve or reject leave requests.', 403);
  }

  const decision = req.body.status;
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new AppError('Choose APPROVED or REJECTED.', 400);
  const comment = String(req.body.decisionComment || '').trim();
  if (comment.length > 1000) throw new AppError('Decision comment must be 1000 characters or fewer.', 400);
  leave.status = decision;
  leave.reviewer = req.user._id;
  leave.decisionComment = comment;
  leave.decisionDate = new Date();
  await leave.save();

  const employee = await Employee.findById(leave.employee._id);
  await Notification.create({ recipient: employee.user, title: `Leave request ${decision.toLowerCase()}`, message: `Your ${leave.leaveType.toLowerCase()} request (${leave.startDate} to ${leave.endDate}) was ${decision.toLowerCase()}.${comment ? ` Comment: ${comment}` : ''}`, type: 'LEAVE' });
  res.json({ leave: await populateLeave(LeaveRequest.findById(leave._id)), message: `Leave request ${decision.toLowerCase()}.` });
});
