const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect, restrictToSuperAdminOr } = require('../middleware/auth');

router.use(protect);

// The audit log is read-only, and strictly for the Super Admin (Vijay requirement)
router.get('/', restrictToSuperAdminOr(), getAuditLogs);

module.exports = router;
