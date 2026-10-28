const { isDateKey } = require('./date');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration({ name, email, password }) {
  if (!name || String(name).trim().length < 2) return 'Name must contain at least 2 characters.';
  if (!email || !EMAIL_PATTERN.test(String(email).trim())) return 'Enter a valid email address.';
  if (!password || String(password).length < 8) return 'Password must contain at least 8 characters.';
  return null;
}

function validateLeaveInput({ leaveType, startDate, endDate, reason }) {
  const allowedTypes = ['Casual Leave', 'Sick Leave', 'Earned Leave'];
  if (!allowedTypes.includes(leaveType)) return 'Choose a valid leave type.';
  if (!isDateKey(startDate) || !isDateKey(endDate)) return 'Use valid start and end dates.';
  if (endDate < startDate) return 'End date cannot be earlier than start date.';
  if (!reason || String(reason).trim().length < 5) return 'Please provide a reason of at least 5 characters.';
  if (String(reason).length > 1000) return 'Reason must be 1000 characters or fewer.';
  return null;
}

function validateAttendanceTimes(checkIn, checkOut) {
  if (!checkIn) return 'A check-in time is required.';
  const inTime = new Date(checkIn);
  if (Number.isNaN(inTime.getTime())) return 'Check-in time is invalid.';
  if (checkOut) {
    const outTime = new Date(checkOut);
    if (Number.isNaN(outTime.getTime())) return 'Check-out time is invalid.';
    if (outTime < inTime) return 'Check-out cannot be earlier than check-in.';
  }
  return null;
}

function safePage(value, fallback = 1) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? Math.min(number, 100000) : fallback;
}

function safeLimit(value, fallback = 10) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? Math.min(number, 100) : fallback;
}

module.exports = { validateRegistration, validateLeaveInput, validateAttendanceTimes, safePage, safeLimit, EMAIL_PATTERN };
