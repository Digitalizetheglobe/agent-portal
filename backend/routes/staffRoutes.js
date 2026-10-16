const express = require('express');
const router = express.Router();
const staff = require('../controllers/staffController');
const { protect, restrictToSuperAdminOr } = require('../middleware/auth');

router.use(protect);

// The team list and its management are for the super admin only
router.use(restrictToSuperAdminOr());
router.get('/', staff.list);
router.patch('/:id', staff.update);
router.post('/:id/reset-password', staff.resetPassword);

module.exports = router;
