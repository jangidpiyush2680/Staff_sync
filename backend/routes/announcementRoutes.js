const router = require('express').Router();
const controller = require('../controllers/announcementController');
const { protect, allowRoles } = require('../middleware/auth');
router.use(protect);
router.get('/', controller.listAnnouncements);
router.post('/', allowRoles('HR'), controller.createAnnouncement);
router.put('/:id', allowRoles('HR'), controller.updateAnnouncement);
router.delete('/:id', allowRoles('HR'), controller.deleteAnnouncement);
module.exports = router;
