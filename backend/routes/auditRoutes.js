const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, restrictToStaffRole } = require('../middleware/auth');

router.use(protect);

// The audit log is read-only, and only the Head of Admission and super admin can see it
router.get('/', restrictToStaffRole('head_admission'), getAuditLogs);

module.exports = router;
