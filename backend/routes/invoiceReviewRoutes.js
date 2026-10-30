const express = require('express');
const router = express.Router();
const {
  getReviewQueue,
  getInvoiceForReview,
  startReview,
  approveInvoice,
  requestCorrection,
  resubmitInvoice,
  rejectInvoice,
  getReviewHistory
} = require('../controllers/invoiceReviewController');
const { protect, restrictToStaffRole, allowStaff } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Queue collection
router.get('/', getReviewQueue);

// Specific subroutes before or alongside :invoiceId
router.get('/:invoiceId/history', getReviewHistory);
router.patch('/:invoiceId/start', restrictToStaffRole('head_admission'), startReview);
router.patch('/:invoiceId/approve', restrictToStaffRole('head_admission'), approveInvoice);
router.patch('/:invoiceId/correction', restrictToStaffRole('head_admission'), requestCorrection);
router.patch('/:invoiceId/resubmit', allowStaff(), resubmitInvoice);
router.patch('/:invoiceId/reject', restrictToStaffRole('head_admission'), rejectInvoice);
router.get('/:invoiceId', getInvoiceForReview);

module.exports = router;
