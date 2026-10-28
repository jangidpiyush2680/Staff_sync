const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { validateRegistration, EMAIL_PATTERN } = require('../utils/validators');

function publicUser(user) {
  return { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };
}

function createToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

exports.register = asyncHandler(async (req, res) => {
  const inputError = validateRegistration(req.body);
  if (inputError) throw new AppError(inputError, 400);
  const email = String(req.body.email).trim().toLowerCase();
  if (await User.exists({ email })) throw new AppError('An account with this email already exists.', 409);

  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await User.create({ name: String(req.body.name).trim(), email, passwordHash, role: 'EMPLOYEE' });
  try {
    const count = await Employee.countDocuments();
    await Employee.create({ user: user._id, employeeId: `SS-${String(count + 1).padStart(4, '0')}`, department: 'General', designation: 'Employee', joiningDate: new Date().toISOString().slice(0, 10) });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }

  const token = createToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!EMAIL_PATTERN.test(email) || !password) throw new AppError('Enter your email and password.', 400);

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError('Email or password is incorrect.', 401);
  if (!user.isActive) throw new AppError('This account has been deactivated. Contact HR.', 403);

  res.json({ token: createToken(user), user: publicUser(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});
