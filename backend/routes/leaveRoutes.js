const router = require('express').Router();
const controller = require('../controllers/leaveController');
const { protect } = require('../middleware/auth');
router.use(protect);
router.get('/', controller.listLeaves);
router.post('/', controller.createLeave);
router.patch('/:id/decision', controller.decideLeave);
module.exports = router;
