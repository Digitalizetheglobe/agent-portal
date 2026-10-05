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
  setCommissionRate,
  getReviewHistory
} = require('../controllers/invoiceReviewController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Queue collection
router.get('/', getReviewQueue);

// Specific subroutes before or alongside :invoiceId
router.get('/:invoiceId/history', getReviewHistory);
router.patch('/:invoiceId/start', restrictTo('admin'), startReview);
router.patch('/:invoiceId/rate', restrictTo('admin'), setCommissionRate);
router.patch('/:invoiceId/approve', restrictTo('admin'), approveInvoice);
router.patch('/:invoiceId/correction', restrictTo('admin'), requestCorrection);
router.patch('/:invoiceId/resubmit', resubmitInvoice);
router.patch('/:invoiceId/reject', restrictTo('admin'), rejectInvoice);
router.get('/:invoiceId', getInvoiceForReview);

module.exports = router;
