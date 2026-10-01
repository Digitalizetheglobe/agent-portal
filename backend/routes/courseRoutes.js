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
const { protect, restrictTo } = require('../middleware/auth');

// All course routes require authentication
router.use(protect);

// Accessible by both Agents and Admins
router.get('/', getCourses);
router.get('/:id', getCourseById);

// Admin-only management endpoints
router.post('/', restrictTo('admin'), createCourse);
router.put('/:id', restrictTo('admin'), updateCourse);
router.patch('/:id/status', restrictTo('admin'), updateCourseStatus);
router.delete('/:id', restrictTo('admin'), deleteCourse);

module.exports = router;
