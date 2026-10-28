const router = require('express').Router();
const controller = require('../controllers/dashboardController');
const { protect, allowRoles } = require('../middleware/auth');
router.use(protect);
router.get('/', controller.getDashboard);
router.get('/reports', allowRoles('HR'), controller.getReports);
module.exports = router;
