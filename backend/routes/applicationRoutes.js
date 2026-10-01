const express = require('express');
const router = express.Router();
const {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
  getApplicationsByStudent,
  getApplicationsByUniversity,
  getApplicationsByAgent
} = require('../controllers/applicationController');
const { protect } = require('../middleware/auth');

const admissionTrackingRoutes = require('./admissionTrackingRoutes');

// All routes are protected by authentication
router.use(protect);

// Specific related query routes (must be mounted before /:id)
router.get('/student/:studentId', getApplicationsByStudent);
router.get('/university/:universityId', getApplicationsByUniversity);
router.get('/agent/:agentId', getApplicationsByAgent);

// Admission tracking workflow routes
router.use('/', admissionTrackingRoutes);

// Core CRUD routes
router.post('/', createApplication);
router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.put('/:id', updateApplication);
router.patch('/:id/status', updateApplicationStatus);
router.delete('/:id', deleteApplication);

module.exports = router;
