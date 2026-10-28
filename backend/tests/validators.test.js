const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRegistration, validateLeaveInput, validateAttendanceTimes, safePage, safeLimit } = require('../utils/validators');
const { isDateKey, getDateKey } = require('../utils/date');

test('registration validation requires name, valid email, and a strong-enough password', () => {
  assert.equal(validateRegistration({ name: 'Aarav', email: 'aarav@example.com', password: 'Pass1234' }), null);
  assert.match(validateRegistration({ name: 'A', email: 'bad', password: 'x' }), /Name/);
});

test('leave validation accepts valid ranges and rejects reverse ranges', () => {
  const valid = { leaveType: 'Casual Leave', startDate: '2026-10-28', endDate: '2026-10-29', reason: 'Personal family matter' };
  assert.equal(validateLeaveInput(valid), null);
  assert.match(validateLeaveInput({ ...valid, endDate: '2026-10-27' }), /earlier/);
  assert.match(validateLeaveInput({ ...valid, startDate: '2026-02-30' }), /valid/);
});

test('attendance validation prevents checkout before check-in', () => {
  assert.equal(validateAttendanceTimes('2026-10-26T09:00:00Z', '2026-10-26T17:00:00Z'), null);
  assert.match(validateAttendanceTimes('2026-10-26T17:00:00Z', '2026-10-26T09:00:00Z'), /earlier/);
});

test('date keys and pagination helpers stay within bounds', () => {
  assert.equal(isDateKey('2026-10-26'), true);
  assert.equal(isDateKey('2026-02-30'), false);
  assert.equal(getDateKey(new Date('2026-10-26T12:00:00Z'), 'UTC'), '2026-10-26');
  assert.equal(safePage('-3'), 1);
  assert.equal(safeLimit('1000'), 100);
});
