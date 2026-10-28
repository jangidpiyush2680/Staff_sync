const User = require('../models/User');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Announcement = require('../models/Announcement');
const Training = require('../models/Training');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { getDateKey } = require('../utils/date');

exports.getDashboard = asyncHandler(async (req, res) => {
  const today = getDateKey();
  const recentAnnouncements = await Announcement.find({ publishedAt: { $lte: new Date() } }).sort({ publishedAt: -1 }).limit(4).select('title message category publishedAt');

  if (req.user.role === 'HR') {
    const employeeUsers = await User.find({ role: 'EMPLOYEE', isActive: true }).select('_id');
    const employeeUserIds = employeeUsers.map((item) => item._id);
    const activeEmployeeProfiles = await Employee.find({ user: { $in: employeeUserIds }, employmentStatus: 'ACTIVE' }).select('_id');
    const employeeProfileIds = activeEmployeeProfiles.map((item) => item._id);
    const [totalEmployees, totalManagers, todayAttendance, pendingLeaves, approvedLeaves, recentLeaves] = await Promise.all([
      Promise.resolve(activeEmployeeProfiles.length),
      User.countDocuments({ role: 'MANAGER', isActive: true }),
      Attendance.countDocuments({ employee: { $in: employeeProfileIds }, attendanceDate: today, status: 'PRESENT' }),
      LeaveRequest.countDocuments({ status: 'PENDING' }),
      LeaveRequest.countDocuments({ status: 'APPROVED' }),
      LeaveRequest.find().sort({ createdAt: -1 }).limit(5).populate({ path: 'employee', populate: { path: 'user', select: 'name' } }).select('leaveType startDate endDate status createdAt'),
    ]);
    return res.json({ role: 'HR', stats: { totalEmployees, totalManagers, checkedInToday: todayAttendance, notCheckedIn: Math.max(0, totalEmployees - todayAttendance), pendingLeaves, approvedLeaves }, recentAnnouncements, recentLeaves });
  }

  if (req.user.role === 'MANAGER') {
    const team = await Employee.find({ manager: req.user._id, employmentStatus: 'ACTIVE' }).select('_id');
    const teamIds = team.map((item) => item._id);
    const [checkedInToday, pendingLeaves, recentLeaves, upcomingTrainings] = await Promise.all([
      Attendance.countDocuments({ employee: { $in: teamIds }, attendanceDate: today, status: 'PRESENT' }),
      LeaveRequest.countDocuments({ employee: { $in: teamIds }, status: 'PENDING' }),
      LeaveRequest.find({ employee: { $in: teamIds } }).sort({ createdAt: -1 }).limit(5).populate({ path: 'employee', populate: { path: 'user', select: 'name' } }).select('leaveType startDate endDate status createdAt'),
      Training.find({ $or: [{ teamManager: req.user._id }, { teamManager: null }], status: 'ACTIVE', startDate: { $gte: today } }).sort({ startDate: 1 }).limit(4).select('title startDate mode'),
    ]);
    return res.json({ role: 'MANAGER', stats: { teamMembers: team.length, checkedInToday, notCheckedIn: Math.max(0, team.length - checkedInToday), pendingLeaves }, recentAnnouncements, recentLeaves, upcomingTrainings });
  }

  const profile = await Employee.findOne({ user: req.user._id }).populate('manager', 'name email');
  const [todayAttendance, attendanceHistory, leaves, upcomingTrainings, unreadNotifications] = await Promise.all([
    profile ? Attendance.findOne({ employee: profile._id, attendanceDate: today }) : null,
    profile ? Attendance.find({ employee: profile._id }).sort({ attendanceDate: -1 }).limit(5).select('attendanceDate checkIn checkOut status') : [],
    profile ? LeaveRequest.find({ employee: profile._id }).sort({ createdAt: -1 }).limit(5).select('leaveType startDate endDate status decisionComment createdAt') : [],
    Training.find({ $or: [{ teamManager: null }, { teamManager: profile?.manager?._id || profile?.manager || null }], status: 'ACTIVE' }).sort({ startDate: 1 }).limit(5).select('title startDate endDate mode enrollments'),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);
  const trainingIds = upcomingTrainings.map((training) => {
    const enrollment = training.enrollments.find((item) => String(item.employee) === String(profile?._id));
    return { _id: training._id, title: training.title, startDate: training.startDate, endDate: training.endDate, mode: training.mode, enrolled: Boolean(enrollment), enrollmentStatus: enrollment?.status || null };
  });
  res.json({ role: 'EMPLOYEE', profile, today, todayAttendance, attendanceHistory, leaves, recentAnnouncements, trainings: trainingIds, unreadNotifications });
});

exports.getReports = asyncHandler(async (req, res) => {
  const today = getDateKey();
  const employeeUsers = await User.find({ role: 'EMPLOYEE', isActive: true }).select('_id');
  const employeeUserIds = employeeUsers.map((item) => item._id);
  const employeeProfiles = await Employee.find({ user: { $in: employeeUserIds }, employmentStatus: 'ACTIVE' }).select('_id');
  const employeeProfileIds = employeeProfiles.map((item) => item._id);
  const [departments, leaveCounts, attendanceRows, totalEmployees] = await Promise.all([
    Employee.aggregate([{ $match: { employmentStatus: 'ACTIVE', user: { $in: employeeUserIds } } }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    LeaveRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Attendance.aggregate([{ $match: { employee: { $in: employeeProfileIds }, attendanceDate: { $gte: getDateKey(new Date(Date.now() - 6 * 86400000)), $lte: today } } }, { $group: { _id: '$attendanceDate', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Promise.resolve(employeeProfiles.length),
  ]);
  const normalizedLeaves = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  leaveCounts.forEach((item) => { normalizedLeaves[item._id] = item.count; });
  res.json({ totalEmployees, departments, leaves: normalizedLeaves, attendanceByDate: attendanceRows, note: 'Attendance counts include persisted records only; employees without a check-in are not automatically classified as absent.' });
});
