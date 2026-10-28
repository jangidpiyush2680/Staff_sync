const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { safePage, safeLimit, EMAIL_PATTERN } = require('../utils/validators');

const employeePopulate = [
  { path: 'user', select: 'name email role isActive createdAt' },
  { path: 'manager', select: 'name email role isActive' },
];

exports.listEmployees = asyncHandler(async (req, res) => {
  const page = safePage(req.query.page);
  const limit = safeLimit(req.query.limit, 10);
  const query = {};

  if (req.user.role === 'MANAGER') query.manager = req.user._id;
  if (req.user.role === 'EMPLOYEE') {
    const mine = await Employee.findOne({ user: req.user._id });
    return res.json({ items: mine ? [await Employee.findById(mine._id).populate(employeePopulate)] : [], page: 1, limit: 1, total: mine ? 1 : 0, pages: 1, departments: mine?.department ? [mine.department] : [] });
  }
  if (req.query.department) query.department = req.query.department;
  if (req.query.status) query.employmentStatus = req.query.status;
  if (req.query.role && ['MANAGER', 'EMPLOYEE'].includes(req.query.role)) {
    const users = await User.find({ role: req.query.role }).select('_id');
    query.user = { $in: users.map((user) => user._id) };
  }

  if (req.query.search) {
    const search = String(req.query.search).trim().slice(0, 100);
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchingUsers = await User.find({ name: { $regex: escapedSearch, $options: 'i' } }).select('_id');
    const userIds = matchingUsers.map((user) => user._id);
    query.$or = [
      { employeeId: { $regex: escapedSearch, $options: 'i' } },
      { department: { $regex: escapedSearch, $options: 'i' } },
      { designation: { $regex: escapedSearch, $options: 'i' } },
      { user: { $in: userIds } },
    ];
  }

  const [total, items, departments] = await Promise.all([
    Employee.countDocuments(query),
    Employee.find(query).populate(employeePopulate).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Employee.distinct('department', req.user.role === 'MANAGER' ? { manager: req.user._id } : {}).then((values) => values.filter(Boolean).sort()),
  ]);
  res.json({ items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), departments });
});

exports.getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).populate(employeePopulate);
  if (!employee) throw new AppError('Employee record not found.', 404);
  if (req.user.role === 'EMPLOYEE' && String(employee.user?._id || employee.user) !== String(req.user._id)) throw new AppError('You can only view your own profile.', 403);
  if (req.user.role === 'MANAGER' && String(employee.manager?._id || employee.manager) !== String(req.user._id)) throw new AppError('This employee is not assigned to your team.', 403);
  res.json({ employee });
});

exports.createEmployee = asyncHandler(async (req, res) => {
  const { name, email, password, employeeId, role = 'EMPLOYEE', department = 'General', designation = 'Employee', phone = '', address = '', joiningDate = '', manager = null } = req.body;
  if (!name || String(name).trim().length < 2) throw new AppError('Name must contain at least 2 characters.', 400);
  if (!EMAIL_PATTERN.test(String(email || '').trim())) throw new AppError('Enter a valid email address.', 400);
  if (!password || String(password).length < 8) throw new AppError('Password must contain at least 8 characters.', 400);
  if (!employeeId || String(employeeId).trim().length < 2) throw new AppError('Employee ID is required.', 400);
  if (!['EMPLOYEE', 'MANAGER'].includes(role)) throw new AppError('Only Employee or Manager accounts can be created here.', 400);
  if (await User.exists({ email: String(email).trim().toLowerCase() })) throw new AppError('An account with this email already exists.', 409);
  if (await Employee.exists({ employeeId: String(employeeId).trim().toUpperCase() })) throw new AppError('Employee ID already exists.', 409);
  if (manager && !(await User.exists({ _id: manager, role: 'MANAGER', isActive: true }))) throw new AppError('Choose an active manager account.', 400);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name: String(name).trim(), email: String(email).trim().toLowerCase(), passwordHash, role });
  try {
    const employee = await Employee.create({ employeeId, user: user._id, phone, address, department, designation, joiningDate, manager: role === 'MANAGER' ? null : (manager || null) });
    res.status(201).json({ employee: await Employee.findById(employee._id).populate(employeePopulate) });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }
});

exports.updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError('Employee record not found.', 404);
  const { name, email, employeeId, role, department, designation, joiningDate, phone, address, manager, employmentStatus, isActive } = req.body;

  if (employeeId !== undefined) {
    if (!String(employeeId).trim()) throw new AppError('Employee ID cannot be empty.', 400);
    const duplicate = await Employee.findOne({ employeeId: String(employeeId).trim().toUpperCase(), _id: { $ne: employee._id } });
    if (duplicate) throw new AppError('Employee ID already exists.', 409);
    employee.employeeId = String(employeeId).trim().toUpperCase();
  }
  for (const field of ['department', 'designation', 'joiningDate', 'phone', 'address']) {
    if (req.body[field] !== undefined) employee[field] = req.body[field];
  }
  if (manager !== undefined) {
    if (manager && !(await User.exists({ _id: manager, role: 'MANAGER', isActive: true }))) throw new AppError('Choose an active manager account.', 400);
    employee.manager = manager || null;
  }
  if (employmentStatus !== undefined) {
    if (!['ACTIVE', 'INACTIVE'].includes(employmentStatus)) throw new AppError('Invalid employment status.', 400);
    employee.employmentStatus = employmentStatus;
  }

  const user = await User.findById(employee.user);
  if (!user) throw new AppError('Associated user account not found.', 404);
  if (name !== undefined) {
    if (String(name).trim().length < 2) throw new AppError('Name must contain at least 2 characters.', 400);
    user.name = String(name).trim();
  }
  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) throw new AppError('Enter a valid email address.', 400);
    if (await User.exists({ email: normalizedEmail, _id: { $ne: user._id } })) throw new AppError('Email address is already in use.', 409);
    user.email = normalizedEmail;
  }
  if (role !== undefined) {
    if (!['EMPLOYEE', 'MANAGER'].includes(role)) throw new AppError('Invalid role.', 400);
    user.role = role;
    if (role === 'MANAGER') employee.manager = null;
  }
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') throw new AppError('isActive must be a boolean value.', 400);
    user.isActive = isActive;
  }
  await Promise.all([employee.save(), user.save()]);
  res.json({ employee: await Employee.findById(employee._id).populate(employeePopulate) });
});

exports.updateOwnProfile = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id });
  if (!employee) throw new AppError('Employee profile not found.', 404);
  const allowed = ['phone', 'address'];
  for (const field of allowed) {
    if (req.body[field] !== undefined) employee[field] = String(req.body[field]).trim();
  }
  if (req.body.name !== undefined) {
    if (String(req.body.name).trim().length < 2) throw new AppError('Name must contain at least 2 characters.', 400);
    await User.findByIdAndUpdate(req.user._id, { name: String(req.body.name).trim() });
  }
  await employee.save();
  res.json({ employee: await Employee.findById(employee._id).populate(employeePopulate) });
});

exports.getOwnProfile = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user: req.user._id }).populate(employeePopulate);
  if (!employee) throw new AppError('Employee profile not found.', 404);
  res.json({ employee });
});

exports.setEmployeeStatus = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError('Employee record not found.', 404);
  if (typeof req.body.isActive !== 'boolean') throw new AppError('isActive must be a boolean value.', 400);
  const active = req.body.isActive;
  const employmentStatus = active ? 'ACTIVE' : 'INACTIVE';
  employee.employmentStatus = employmentStatus;
  await employee.save();
  await User.findByIdAndUpdate(employee.user, { isActive: active });
  res.json({ message: `Account ${active ? 'activated' : 'deactivated'}.`, employee: await Employee.findById(employee._id).populate(employeePopulate) });
});
