const invoiceService = require('../services/invoiceService');

// @desc    Create new invoice (supports both applicationIds and legacy studentIds)
// @route   POST /api/invoices
// @access  Private (Agent or Admin)
exports.createInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.createInvoice(req.body, req.user);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get all invoices (with search, filter, pagination)
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const result = await invoiceService.getInvoices(req.query, req.user);

    // Set standard pagination headers
    res.setHeader('X-Total-Count', result.total);
    res.setHeader('X-Page', result.page);
    res.setHeader('X-Total-Pages', result.totalPages);
    res.setHeader('X-Limit', result.limit);

    // If envelope requested, return wrapper object; otherwise return array to match project conventions
    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }

    res.status(200).json(result.invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get applications eligible for invoicing
// @route   GET /api/invoices/eligible-applications
// @access  Private
exports.getEligibleApplications = async (req, res) => {
  try {
    const result = await invoiceService.getEligibleApplications(req.query, req.user);

    // Set standard pagination headers
    res.setHeader('X-Total-Count', result.total);
    res.setHeader('X-Page', result.page);
    res.setHeader('X-Total-Pages', result.totalPages);
    res.setHeader('X-Limit', result.limit);

    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }

    res.status(200).json(result.applications);
  } catch (error) {
    console.error('Get eligible applications error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id, req.user);
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Update invoice status
// @route   PATCH /api/invoices/:id/status
// @access  Private (Admin only)
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const updated = await invoiceService.updateInvoiceStatus(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const result = await invoiceService.deleteInvoice(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};
