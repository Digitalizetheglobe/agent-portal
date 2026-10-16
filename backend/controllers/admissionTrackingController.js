const admissionTrackingService = require('../services/admissionTrackingService');

// @desc    Update application workflow status (submit, start review, reject, withdraw)
// @route   PATCH /api/applications/:id/workflow/status
// @access  Private
exports.updateWorkflowStatus = async (req, res) => {
  try {
    const updated = await admissionTrackingService.updateWorkflowStatus(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update workflow status error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get application audit history
// @route   GET /api/applications/:id/history
// @access  Private
exports.getApplicationHistory = async (req, res) => {
  try {
    const history = await admissionTrackingService.getApplicationHistory(
      req.params.id,
      req.user
    );
    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json({ success: true, history });
    }
    res.status(200).json(history);
  } catch (error) {
    console.error('Get application history error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};
