const express = require('express');
const router = express.Router();
const {
  updateWorkflowStatus,
  getApplicationHistory
} = require('../controllers/admissionTrackingController');
const { protect, allowStaff } = require('../middleware/auth');

// All routes are protected by authentication
router.use(protect);

// Review status: submit, start review, reject, withdraw
router.patch('/:id/workflow/status', allowStaff('head_admission'), updateWorkflowStatus);

// Application history (accessible to authorized viewers: admin or own agent)
router.get('/:id/history', getApplicationHistory);

module.exports = router;
