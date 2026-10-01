const studentVerificationService = require('../services/studentVerificationService');

// @desc    Get verification queue
// @route   GET /api/students/verification/queue
// @access  Admin only
exports.getVerificationQueue = async (req, res) => {
  try {
    const result = await studentVerificationService.getVerificationQueue(req.query, req.user);
    res.setHeader('X-Total-Count', result.total);
    res.setHeader('X-Page', result.page);
    res.setHeader('X-Total-Pages', result.totalPages);
    res.setHeader('X-Limit', result.limit);
    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }
    res.status(200).json(result.students);
  } catch (error) {
    console.error('Get verification queue error:', error);
    res.status(error.statusCode || 500).json({ success: false, detail: error.message || 'Server error' });
  }
};

// @desc    Get student verification detail
// @route   GET /api/students/:id/verification
// @access  Admin or own agent
exports.getVerificationDetail = async (req, res) => {
  try {
    const result = await studentVerificationService.getVerificationDetail(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get verification detail error:', error);
    res.status(error.statusCode || 500).json({ success: false, detail: error.message || 'Server error' });
  }
};

// @desc    Initiate verification (Pending -> UnderReview)
// @route   PATCH /api/students/:id/verification/initiate
// @access  Admin only
exports.initiateVerification = async (req, res) => {
  try {
    const result = await studentVerificationService.initiateVerification(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    console.error('Initiate verification error:', error);
    res.status(error.statusCode || 500).json({ success: false, detail: error.message || 'Server error' });
  }
};

// @desc    Approve verification (UnderReview -> Verified)
// @route   PATCH /api/students/:id/verification/verify
// @access  Admin only
exports.verifyStudent = async (req, res) => {
  try {
    const result = await studentVerificationService.verifyStudent(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    console.error('Verify student error:', error);
    res.status(error.statusCode || 500).json({ success: false, detail: error.message || 'Server error' });
  }
};

// @desc    Reject verification (UnderReview -> Rejected)
// @route   PATCH /api/students/:id/verification/reject
// @access  Admin only
exports.rejectStudent = async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await studentVerificationService.rejectStudent(req.params.id, reason, req.user);
    res.status(200).json(result);
  } catch (error) {
    console.error('Reject student error:', error);
    res.status(error.statusCode || 500).json({ success: false, detail: error.message || 'Server error' });
  }
};

// @desc    Get verification history
// @route   GET /api/students/:id/verification/history
// @access  Admin or own agent
exports.getVerificationHistory = async (req, res) => {
  try {
    const result = await studentVerificationService.getVerificationHistory(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get verification history error:', error);
    res.status(error.statusCode || 500).json({ success: false, detail: error.message || 'Server error' });
  }
};
