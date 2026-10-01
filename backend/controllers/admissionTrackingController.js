const admissionTrackingService = require('../services/admissionTrackingService');

// @desc    Update application workflow status
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

// @desc    Schedule university campus visit
// @route   POST /api/applications/:id/visit
// @access  Private
exports.scheduleVisit = async (req, res) => {
  try {
    const updated = await admissionTrackingService.scheduleVisit(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Schedule visit error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Mark scheduled visit completed
// @route   PATCH /api/applications/:id/visit/complete
// @access  Private
exports.completeVisit = async (req, res) => {
  try {
    const updated = await admissionTrackingService.completeVisit(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Complete visit error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Record unconditional offer
// @route   POST /api/applications/:id/offer
// @access  Private
exports.recordOffer = async (req, res) => {
  try {
    const updated = await admissionTrackingService.recordOffer(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Record offer error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Record conditional offer
// @route   POST /api/applications/:id/conditional-offer
// @access  Private
exports.recordConditionalOffer = async (req, res) => {
  try {
    const updated = await admissionTrackingService.recordConditionalOffer(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Record conditional offer error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Confirm admission
// @route   POST /api/applications/:id/admission
// @access  Private
exports.confirmAdmission = async (req, res) => {
  try {
    const updated = await admissionTrackingService.confirmAdmission(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Confirm admission error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Record student enrollment
// @route   POST /api/applications/:id/enrollment
// @access  Private
exports.recordEnrollment = async (req, res) => {
  try {
    const updated = await admissionTrackingService.recordEnrollment(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Record enrollment error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Update deposit details
// @route   PATCH /api/applications/:id/deposit
// @access  Private
exports.updateDeposit = async (req, res) => {
  try {
    const updated = await admissionTrackingService.updateDeposit(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update deposit error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get tracking detail with milestones
// @route   GET /api/applications/:id/tracking
// @access  Private
exports.getTrackingDetail = async (req, res) => {
  try {
    const tracking = await admissionTrackingService.getTrackingDetail(
      req.params.id,
      req.user
    );
    res.status(200).json(tracking);
  } catch (error) {
    console.error('Get tracking detail error:', error);
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
