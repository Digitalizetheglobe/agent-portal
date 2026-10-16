const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  updateCourseStatus,
  deleteCourse
} = require('../controllers/courseController');
const { protect, restrictTo, restrictToSuperAdminOr } = require('../middleware/auth');

// All course routes require authentication
router.use(protect);

// Accessible by both Agents and Admins
router.get('/', getCourses);
router.get('/:id', getCourseById);

// Admin-only management endpoints
router.post('/', restrictToSuperAdminOr('head_admission'), createCourse);
router.put('/:id', restrictToSuperAdminOr('head_admission'), updateCourse);
router.patch('/:id/status', restrictToSuperAdminOr('head_admission'), updateCourseStatus);
router.delete('/:id', restrictToSuperAdminOr('head_admission'), deleteCourse);

module.exports = router;
