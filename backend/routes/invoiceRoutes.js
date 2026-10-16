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
const { protect, restrictToStaffRole } = require('../middleware/auth');

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
router.patch('/:id/status', restrictToStaffRole('head_admission'), updateInvoiceStatus);

module.exports = router;
