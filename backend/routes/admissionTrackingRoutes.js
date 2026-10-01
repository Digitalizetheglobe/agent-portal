const express = require('express');
const router = express.Router();
const {
  updateWorkflowStatus,
  scheduleVisit,
  completeVisit,
  recordOffer,
  recordConditionalOffer,
  confirmAdmission,
  recordEnrollment,
  updateDeposit,
  getTrackingDetail,
  getApplicationHistory
} = require('../controllers/admissionTrackingController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes are protected by authentication
router.use(protect);

// Workflow Status
router.patch('/:id/workflow/status', updateWorkflowStatus);

// Visit Tracking (Agents may schedule/request visits; completion is institutional/admin)
router.post('/:id/visit', scheduleVisit);
router.patch('/:id/visit/complete', restrictTo('admin'), completeVisit);

// Offer Tracking (Institutional/Admin only)
router.post('/:id/offer', restrictTo('admin'), recordOffer);
router.post('/:id/conditional-offer', restrictTo('admin'), recordConditionalOffer);

// Admission & Enrollment (Institutional/Admin only - P0)
router.post('/:id/admission', restrictTo('admin'), confirmAdmission);
router.post('/:id/enrollment', restrictTo('admin'), recordEnrollment);

// Deposit Tracking (Institutional/Admin/Finance only - P0)
router.patch('/:id/deposit', restrictTo('admin'), updateDeposit);

// Tracking Detail & History (Accessible to authorized viewers: admin or own agent)
router.get('/:id/tracking', getTrackingDetail);
router.get('/:id/history', getApplicationHistory);

module.exports = router;
