const router = require('express').Router();
const controller = require('../controllers/attendanceController');
const { protect, allowRoles } = require('../middleware/auth');
router.use(protect);
router.post('/check-in', controller.checkIn);
router.patch('/check-out', controller.checkOut);
router.get('/', controller.listAttendance);
router.patch('/:id/correction', allowRoles('HR'), controller.correctAttendance);
module.exports = router;
