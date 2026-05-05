const express = require('express');
const router = express.Router();
const { 
  createInvoice, 
  getInvoices, 
  getInvoice, 
  updateInvoiceStatus 
} = require('../controllers/invoiceController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .post(createInvoice)
  .get(getInvoices);

router.route('/:id')
  .get(getInvoice);

router.patch('/:id/status', restrictTo('admin'), updateInvoiceStatus);

module.exports = router;
