const express = require('express');
const router = express.Router();
const { 
  createInvoice, 
  getInvoices, 
  getInvoice, 
  getEligibleApplications,
  updateInvoiceStatus,
  deleteInvoice
} = require('../controllers/invoiceController');
const { protect, restrictTo } = require('../middleware/auth');

// All invoice routes require authentication
router.use(protect);

// Specific discovery endpoint (MUST be declared before /:id)
router.get('/eligible-applications', getEligibleApplications);

// Invoice collection endpoints
router.route('/')
  .post(createInvoice)
  .get(getInvoices);

// Individual invoice endpoints
router.route('/:id')
  .get(getInvoice)
  .delete(deleteInvoice);

// Admin-only status update
router.patch('/:id/status', restrictTo('admin'), updateInvoiceStatus);

module.exports = router;
