const payoffService = require('../services/payoffService');

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
    const payoff = await payoffService.settlePayoff(req.params.id, req.body, req.user);
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
