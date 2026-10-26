const payoffService = require('../services/payoffService');
const receivableService = require('../services/universityReceivableService');

const sendError = (res, label, error) => {
  console.error(label, error);
  res.status(error.statusCode || 500).json({ success: false, detail: error.message || 'Server error' });
};

// @desc    What each university owes QStudy, grouped by university and currency
// @route   GET /api/payoffs/university-receivables
// @access  Private (Accounts, Head of Admission, super admin)
exports.getUniversityReceivables = async (req, res) => {
  try {
    res.status(200).json(await receivableService.getReceivables(req.user));
  } catch (error) {
    sendError(res, 'Get university receivables error:', error);
  }
};

// @desc    Record a payment from a university
// @route   POST /api/payoffs/university-receivables/payments
// @access  Private (Accounts, Head of Admission, super admin)
exports.recordUniversityReceivablePayment = async (req, res) => {
  try {
    res.status(201).json(await receivableService.recordPayment(req.body, req.user));
  } catch (error) {
    sendError(res, 'Record university payment error:', error);
  }
};

// @desc    Reverse a university payment entered by mistake
// @route   PATCH /api/payoffs/university-receivables/payments/:id/reverse
// @access  Private (Accounts, Head of Admission, super admin)
exports.reverseUniversityPayment = async (req, res) => {
  try {
    res.status(200).json(await receivableService.reversePayment(req.params.id, req.body, req.user));
  } catch (error) {
    sendError(res, 'Reverse university payment error:', error);
  }
};

// @desc    Get all payoffs (with status filter, search, pagination)
// @route   GET /api/payoffs
// @access  Private (Admin sees all; Agent sees own)
exports.getPayoffs = async (req, res) => {
  try {
    const result = await payoffService.getPayoffs(req.query, req.user);
    res.setHeader('X-Total-Count', result.total);
    res.setHeader('X-Page', result.page);
    res.setHeader('X-Total-Pages', result.totalPages);
    res.setHeader('X-Limit', result.limit);

    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }
    res.status(200).json(result.payoffs);
  } catch (error) {
    console.error('Get payoffs error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get single payoff by ID
// @route   GET /api/payoffs/:id
// @access  Private (Admin sees any; Agent sees own)
exports.getPayoff = async (req, res) => {
  try {
    const payoff = await payoffService.getPayoffById(req.params.id, req.user);
    res.status(200).json(payoff);
  } catch (error) {
    console.error('Get payoff error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Settle payoff (human-confirmed offline settlement)
// @route   PATCH /api/payoffs/:id/settle
// @access  Private (Admin only)
exports.settlePayoff = async (req, res) => {
  try {
    const payoff = await payoffService.settlePayoff(req.params.id, req.body, req.user, req.file);
    res.status(200).json({
      success: true,
      detail: 'Payoff settled successfully',
      data: payoff
    });
  } catch (error) {
    console.error('Settle payoff error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Record that the university paid QStudy (unlocks paying the agent)
// @route   PATCH /api/payoffs/:id/university-payment
// @access  Private (Accounts, Head of Admission, super admin)
exports.recordUniversityPayment = async (req, res) => {
  try {
    const payoff = await payoffService.recordUniversityPayment(req.params.id, req.body, req.user);
    res.status(200).json(payoff);
  } catch (error) {
    console.error('Record university payment error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Allow the agent to be paid before the university has paid (needs a note)
// @route   PATCH /api/payoffs/:id/bypass-block
// @access  Private (Head of Admission, super admin)
exports.authorizeBypass = async (req, res) => {
  try {
    const payoff = await payoffService.authorizeBypass(req.params.id, req.body, req.user);
    res.status(200).json(payoff);
  } catch (error) {
    console.error('Authorize bypass error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Download the payment slip
// @route   GET /api/payoffs/:id/slip
// @access  Private (the agent who owns the payoff, staff)
exports.downloadSlip = async (req, res) => {
  try {
    const { data, contentType, fileName } = await payoffService.getSlipFile(req.params.id, req.user);
    res.setHeader('Content-Type', contentType);
    const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
    res.send(Buffer.from(data));
  } catch (error) {
    console.error('Download payment slip error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Cancel payoff
// @route   PATCH /api/payoffs/:id/cancel
// @access  Private (Admin only)
exports.cancelPayoff = async (req, res) => {
  try {
    const payoff = await payoffService.cancelPayoff(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      detail: 'Payoff cancelled successfully',
      data: payoff
    });
  } catch (error) {
    console.error('Cancel payoff error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Create a replacement for a cancelled payoff (same approved invoice and commission)
// @route   POST /api/payoffs/:id/replace
// @access  Private (Accounts, super admin)
exports.replacePayoff = async (req, res) => {
  try {
    const payoff = await payoffService.replacePayoff(req.params.id, req.body, req.user);
    res.status(201).json({
      success: true,
      detail: 'Replacement payoff created',
      data: payoff
    });
  } catch (error) {
    console.error('Replace payoff error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};
