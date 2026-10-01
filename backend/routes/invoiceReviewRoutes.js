const express = require('express');
const router = express.Router();
const {
  getReviewQueue,
  getInvoiceForReview,
  startReview,
  approveInvoice,
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
router.patch('/:invoiceId/reject', restrictTo('admin'), rejectInvoice);
router.get('/:invoiceId', getInvoiceForReview);

module.exports = router;
