const invoiceReviewService = require('../services/invoiceReviewService');

// @desc    Get finance review queue
// @route   GET /api/invoice-reviews
// @access  Private (Admin only)
exports.getReviewQueue = async (req, res) => {
  try {
    const result = await invoiceReviewService.getReviewQueue(req.query, req.user);

    res.setHeader('X-Total-Count', result.total);
    res.setHeader('X-Page', result.page);
    res.setHeader('X-Total-Pages', result.totalPages);
    res.setHeader('X-Limit', result.limit);

    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }

    res.status(200).json(result.invoices || result.reviews || []);
  } catch (error) {
    console.error('Get review queue error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get single invoice for review
// @route   GET /api/invoice-reviews/:invoiceId
// @access  Private (Admin or Owner Agent)
exports.getInvoiceForReview = async (req, res) => {
  try {
    const invoice = await invoiceReviewService.getInvoiceForReview(req.params.invoiceId, req.user);
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Get invoice for review error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Start review on an invoice
// @route   PATCH /api/invoice-reviews/:invoiceId/start
// @access  Private (Admin only)
exports.startReview = async (req, res) => {
  try {
    const updated = await invoiceReviewService.startReview(req.params.invoiceId, req.user);
    res.status(200).json(updated);
  } catch (error) {
    console.error('Start review error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Set commission rate on invoice
// @route   PATCH /api/invoice-reviews/:invoiceId/rate
// @access  Private (Admin only)
exports.setCommissionRate = async (req, res) => {
  try {
    const updated = await invoiceReviewService.setCommissionRate(
      req.params.invoiceId,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Set commission rate error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Approve invoice review (creates snapshots & payoff)
// @route   PATCH /api/invoice-reviews/:invoiceId/approve
// @access  Private (Admin only)
exports.approveInvoice = async (req, res) => {
  try {
    const updated = await invoiceReviewService.approveInvoice(
      req.params.invoiceId,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Approve invoice error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Request correction on invoice
// @route   PATCH /api/invoice-reviews/:invoiceId/correction
// @access  Private (Admin only)
exports.requestCorrection = async (req, res) => {
  try {
    const updated = await invoiceReviewService.requestCorrection(
      req.params.invoiceId,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Request correction error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Resubmit invoice after correction
// @route   PATCH /api/invoice-reviews/:invoiceId/resubmit
// @access  Private (Agent owner only)
exports.resubmitInvoice = async (req, res) => {
  try {
    const updated = await invoiceReviewService.resubmitInvoice(
      req.params.invoiceId,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Resubmit invoice error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Reject invoice review
// @route   PATCH /api/invoice-reviews/:invoiceId/reject
// @access  Private (Admin only)
exports.rejectInvoice = async (req, res) => {
  try {
    const updated = await invoiceReviewService.rejectInvoice(
      req.params.invoiceId,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Reject invoice error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get review audit history
// @route   GET /api/invoice-reviews/:invoiceId/history
// @access  Private (Admin or Owner Agent)
exports.getReviewHistory = async (req, res) => {
  try {
    const history = await invoiceReviewService.getReviewHistory(
      req.params.invoiceId,
      req.user
    );

    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json({ success: true, history });
    }

    res.status(200).json(history);
  } catch (error) {
    console.error('Get review history error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};
