const courseService = require('../services/courseService');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private (Agent, Admin)
exports.getCourses = async (req, res, next) => {
  try {
    const result = await courseService.getCourses(req.query, req.user);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Private (Agent, Admin)
exports.getCourseById = async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(req.params.id);
    res.json({
      success: true,
      course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private (Admin only)
exports.createCourse = async (req, res, next) => {
  try {
    const course = await courseService.createCourse(req.body, req.user);
    res.status(201).json({
      success: true,
      course,
      message: 'Course created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Admin only)
exports.updateCourse = async (req, res, next) => {
  try {
    const course = await courseService.updateCourse(req.params.id, req.body, req.user);
    res.json({
      success: true,
      course,
      message: 'Course updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course status
// @route   PATCH /api/courses/:id/status
// @access  Private (Admin only)
exports.updateCourseStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const course = await courseService.updateStatus(req.params.id, status, req.user);
    res.json({
      success: true,
      course,
      message: `Course status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Admin only)
exports.deleteCourse = async (req, res, next) => {
  try {
    const result = await courseService.deleteCourse(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
