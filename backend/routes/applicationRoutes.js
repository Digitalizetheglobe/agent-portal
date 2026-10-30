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
const multer = require('multer');
const { updateStage, submitFeeProof, reviewFeeProof, downloadFeeProof, submitArrivalTicket, downloadArrivalTicket } = require('../controllers/visaPipelineController');
const { protect, allowStaff, requireActivatedAgent, restrictTo, restrictToStaffRole } = require('../middleware/auth');

// Proof of fee payment: a scan or photo, up to 10MB
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Upload a PDF, JPG or PNG.'), false);
  }
});

const admissionTrackingRoutes = require('./admissionTrackingRoutes');

// All routes are protected by authentication
router.use(protect);

// Specific related query routes (must be mounted before /:id)
router.get('/student/:studentId', getApplicationsByStudent);
router.get('/university/:universityId', getApplicationsByUniversity);
router.get('/agent/:agentId', getApplicationsByAgent);

// Admission tracking workflow routes
router.use('/', admissionTrackingRoutes);

// Visa pipeline: the Head of Admission moves stages and checks the fee proof; the agent uploads it
router.patch('/:id/pipeline', restrictToStaffRole('head_admission'), updateStage);
router.post('/:id/fee-proof', restrictTo('agent'), proofUpload.single('file'), submitFeeProof);
router.patch('/:id/fee-proof/review', restrictToStaffRole('head_admission'), reviewFeeProof);
router.get('/:id/fee-proof/file', downloadFeeProof);
router.post('/:id/arrival-ticket', restrictTo('agent', 'admin'), proofUpload.single('file'), submitArrivalTicket);
router.get('/:id/arrival-ticket/file', downloadArrivalTicket);

// Core CRUD routes
// Only agents and the super admin create applications (allowStaff() with no roles blocks staff roles)
router.post('/', allowStaff(), requireActivatedAgent, createApplication);
router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.put('/:id', allowStaff('head_admission'), updateApplication);
router.patch('/:id/status', allowStaff('head_admission'), updateApplicationStatus);
router.delete('/:id', allowStaff('head_admission'), deleteApplication);

module.exports = router;
