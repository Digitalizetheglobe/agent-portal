const express = require('express');
const router = express.Router();
const {
  createUniversity,
  getUniversities,
  getUniversityById,
  updateUniversity,
  updateUniversityStatus,
  deleteUniversity,
  getUniversityApplications
} = require('../controllers/universityController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes are protected by authentication
router.use(protect);

// Accessible by both Admin and Agent
router.get('/', getUniversities);
router.get('/:id/applications', getUniversityApplications);
router.get('/:id', getUniversityById);

// Admin-only management routes
router.post('/', restrictTo('admin'), createUniversity);
router.put('/:id', restrictTo('admin'), updateUniversity);
router.patch('/:id/status', restrictTo('admin'), updateUniversityStatus);
router.delete('/:id', restrictTo('admin'), deleteUniversity);

module.exports = router;
