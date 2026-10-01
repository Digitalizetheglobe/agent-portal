const universityService = require('../services/universityService');

// @desc    Create new university
// @route   POST /api/universities
// @access  Private (Admin only)
exports.createUniversity = async (req, res) => {
  try {
    const university = await universityService.createUniversity(req.body, req.user);
    res.status(201).json(university);
  } catch (error) {
    console.error('Create university error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get all universities (with filter, search, pagination)
// @route   GET /api/universities
// @access  Private (Admin & Agent)
exports.getUniversities = async (req, res) => {
  try {
    const result = await universityService.getUniversities(req.query, req.user);

    // Set standard pagination headers
    res.setHeader('X-Total-Count', result.total);
    res.setHeader('X-Page', result.page);
    res.setHeader('X-Total-Pages', result.totalPages);
    res.setHeader('X-Limit', result.limit);

    // Return envelope if requested, otherwise return array matching project conventions
    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }

    res.status(200).json(result.universities);
  } catch (error) {
    console.error('Get universities error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get single university by ID
// @route   GET /api/universities/:id
// @access  Private (Admin & Agent)
exports.getUniversityById = async (req, res) => {
  try {
    const university = await universityService.getUniversityById(req.params.id, req.user);
    res.status(200).json(university);
  } catch (error) {
    console.error('Get university by ID error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Update university details
// @route   PUT /api/universities/:id
// @access  Private (Admin only)
exports.updateUniversity = async (req, res) => {
  try {
    const updated = await universityService.updateUniversity(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update university error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Update university status (active / inactive)
// @route   PATCH /api/universities/:id/status
// @access  Private (Admin only)
exports.updateUniversityStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await universityService.updateUniversityStatus(req.params.id, status);
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update university status error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Delete university
// @route   DELETE /api/universities/:id
// @access  Private (Admin only)
exports.deleteUniversity = async (req, res) => {
  try {
    const result = await universityService.deleteUniversity(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error('Delete university error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get applications for a university
// @route   GET /api/universities/:id/applications
// @access  Private (Admin & Agent; Agent only sees own applications)
exports.getUniversityApplications = async (req, res) => {
  try {
    const result = await universityService.getUniversityApplications(req.params.id, req.query, req.user);

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
    console.error('Get university applications error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};
