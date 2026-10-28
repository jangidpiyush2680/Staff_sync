require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDatabase = require('../config/db');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Announcement = require('../models/Announcement');
const Training = require('../models/Training');
const { getDateKey } = require('../utils/date');

async function upsertUser({ name, email, role, passwordHash }) {
  return User.findOneAndUpdate({ email }, { $set: { name, role, isActive: true }, $setOnInsert: { passwordHash } }, { upsert: true, new: true, setDefaultsOnInsert: true }).select('+passwordHash');
}

async function main() {
  await connectDatabase();
  const demoPassword = process.env.SEED_PASSWORD || 'StaffSync@123';
  if (demoPassword.length < 8) throw new Error('SEED_PASSWORD must contain at least 8 characters.');
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const accountSpecs = [
    { name: 'Olivia HR', email: process.env.SEED_HR_EMAIL || 'hr@staffsync.local', role: 'HR' },
    { name: 'Noah Manager', email: process.env.SEED_MANAGER_EMAIL || 'manager@staffsync.local', role: 'MANAGER' },
    { name: 'Aarav Sharma', email: 'aarav@staffsync.local', role: 'EMPLOYEE' },
    { name: 'Maya Patel', email: 'maya@staffsync.local', role: 'EMPLOYEE' },
    { name: 'Rohan Verma', email: 'rohan@staffsync.local', role: 'EMPLOYEE' },
  ];
  const users = {};
  for (const spec of accountSpecs) users[spec.role === 'EMPLOYEE' ? spec.email : spec.role] = await upsertUser({ ...spec, passwordHash });

  const manager = users.MANAGER;
  const profiles = {};
  const profileSpecs = [
    { key: 'MANAGER', employeeId: 'SS-0001', user: manager, department: 'People Operations', designation: 'Team Manager', manager: null },
    { key: 'aarav@staffsync.local', employeeId: 'SS-0002', user: users['aarav@staffsync.local'], department: 'Engineering', designation: 'Software Engineer', manager: manager._id },
    { key: 'maya@staffsync.local', employeeId: 'SS-0003', user: users['maya@staffsync.local'], department: 'Design', designation: 'Product Designer', manager: manager._id },
    { key: 'rohan@staffsync.local', employeeId: 'SS-0004', user: users['rohan@staffsync.local'], department: 'Engineering', designation: 'QA Analyst', manager: manager._id },
  ];
  for (const spec of profileSpecs) {
    profiles[spec.key] = await Employee.findOneAndUpdate({ user: spec.user._id }, { $set: { employeeId: spec.employeeId, department: spec.department, designation: spec.designation, joiningDate: '2025-07-01', manager: spec.manager, employmentStatus: 'ACTIVE' } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  const today = getDateKey();
  const now = new Date();
  for (const key of ['aarav@staffsync.local', 'maya@staffsync.local']) {
    await Attendance.findOneAndUpdate({ employee: profiles[key]._id, attendanceDate: today }, { $setOnInsert: { checkIn: new Date(now.getTime() - 3 * 60 * 60 * 1000), checkOut: null, status: 'PRESENT' } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  await LeaveRequest.findOneAndUpdate({ employee: profiles['aarav@staffsync.local']._id, reason: 'Family commitment demo request' }, { $setOnInsert: { leaveType: 'Casual Leave', startDate: today, endDate: today, status: 'PENDING' } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await LeaveRequest.findOneAndUpdate({ employee: profiles['maya@staffsync.local']._id, reason: 'Medical appointment demo request' }, { $setOnInsert: { leaveType: 'Sick Leave', startDate: today, endDate: today, status: 'APPROVED', reviewer: manager._id, decisionDate: new Date(), decisionComment: 'Demo approval' } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  await Announcement.findOneAndUpdate({ title: 'Welcome to StaffSync' }, { $setOnInsert: { message: 'StaffSync is your central place for attendance, leave requests, announcements, and training.', category: 'General', createdBy: users.HR._id, publishedAt: new Date() } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await Announcement.findOneAndUpdate({ title: 'Keep your profile current' }, { $setOnInsert: { message: 'Please review your profile information and contact HR if your role or department changes.', category: 'HR', createdBy: users.HR._id, publishedAt: new Date() } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await Training.findOneAndUpdate({ title: 'Workplace Communication Essentials' }, { $setOnInsert: { description: 'A practical session on clear written communication, feedback, and productive team meetings.', trainer: 'People Operations', startDate: today, endDate: '', mode: 'Online', status: 'ACTIVE', createdBy: manager._id, teamManager: manager._id, enrollments: [] } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await Training.findOneAndUpdate({ title: 'Secure Work Habits' }, { $setOnInsert: { description: 'Learn safe password practices, phishing awareness, and responsible handling of company information.', trainer: 'IT Support', startDate: today, endDate: '', mode: 'Hybrid', location: 'Main meeting room', status: 'ACTIVE', createdBy: users.HR._id, teamManager: null, enrollments: [] } }, { upsert: true, new: true, setDefaultsOnInsert: true });

  console.log('\nStaffSync demo data is ready.');
  console.log(`HR:      ${process.env.SEED_HR_EMAIL || 'hr@staffsync.local'} / ${demoPassword}`);
  console.log(`Manager: ${process.env.SEED_MANAGER_EMAIL || 'manager@staffsync.local'} / ${demoPassword}`);
  console.log(`Employee: aarav@staffsync.local / ${demoPassword}`);
  console.log('These are local-development-only credentials. Change them before any deployment.');
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(`Seed failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
