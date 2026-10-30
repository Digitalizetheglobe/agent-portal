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
const { protect, restrictToStaffRole, allowStaff } = require('../middleware/auth');

// All invoice routes require authentication
router.use(protect);

// Specific discovery endpoint (MUST be declared before /:id)
router.get('/eligible-applications', getEligibleApplications);

// Invoice collection endpoints
router.route('/')
  // Only agents and the super admin raise invoices (allowStaff() with no roles blocks staff roles)
  .post(allowStaff(), createInvoice)
  .get(getInvoices);

// Individual invoice endpoints
router.route('/:id')
  .get(getInvoice)
  .delete(allowStaff(), deleteInvoice);

// Admin-only status update
router.patch('/:id/status', restrictToStaffRole('head_admission'), updateInvoiceStatus);

module.exports = router;
