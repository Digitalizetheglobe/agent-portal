const applicationService = require('../services/applicationService');

// @desc    Create new application
// @route   POST /api/applications
// @access  Private (Agent or Admin)
exports.createApplication = async (req, res) => {
  try {
    const application = await applicationService.createApplication(req.body, req.user);
    res.status(201).json(application);
  } catch (error) {
    console.error('Create application error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get all applications (with filter, search, pagination)
// @route   GET /api/applications
// @access  Private
exports.getApplications = async (req, res) => {
  try {
    const result = await applicationService.getApplications(req.query, req.user);

    // Set standard pagination headers
    res.setHeader('X-Total-Count', result.total);
    res.setHeader('X-Page', result.page);
    res.setHeader('X-Total-Pages', result.totalPages);
    res.setHeader('X-Limit', result.limit);

    // If envelope requested, return wrapper object; otherwise return array to match project conventions
    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }

    res.status(200).json(result.applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get single application by ID
// @route   GET /api/applications/:id
// @access  Private
exports.getApplicationById = async (req, res) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id, req.user);
    res.status(200).json(application);
  } catch (error) {
    console.error('Get application by ID error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Update application details
// @route   PUT /api/applications/:id
// @access  Private
exports.updateApplication = async (req, res) => {
  try {
    const updated = await applicationService.updateApplication(req.params.id, req.body, req.user);
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Update application status
// @route   PATCH /api/applications/:id/status
// @access  Private
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const updated = await applicationService.updateApplicationStatus(req.params.id, status, remarks, req.user);
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Private
exports.deleteApplication = async (req, res) => {
  try {
    const result = await applicationService.deleteApplication(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get applications for a specific student
// @route   GET /api/applications/student/:studentId
// @access  Private
exports.getApplicationsByStudent = async (req, res) => {
  try {
    const result = await applicationService.getApplicationsByStudent(req.params.studentId, req.user);
    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }
    res.status(200).json(result.applications);
  } catch (error) {
    console.error('Get applications by student error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get applications for a specific university
// @route   GET /api/applications/university/:universityId
// @access  Private
exports.getApplicationsByUniversity = async (req, res) => {
  try {
    const result = await applicationService.getApplicationsByUniversity(req.params.universityId, req.user);
    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }
    res.status(200).json(result.applications);
  } catch (error) {
    console.error('Get applications by university error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get applications for a specific agent
// @route   GET /api/applications/agent/:agentId
// @access  Private
exports.getApplicationsByAgent = async (req, res) => {
  try {
    const result = await applicationService.getApplicationsByAgent(req.params.agentId, req.user);
    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }
    res.status(200).json(result.applications);
  } catch (error) {
    console.error('Get applications by agent error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};
