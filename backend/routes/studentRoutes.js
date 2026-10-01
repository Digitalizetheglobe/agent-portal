const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  getStudents, 
  getStudent, 
  createStudent, 
  updateStudent,
  deleteStudent,
  getStudentApplications,
  uploadDocument, 
  downloadDocument,
  updateStudentStatus,
  verifyStudentDocument,
  requestDocument
} = require('../controllers/studentController');
const {
  getVerificationQueue,
  getVerificationDetail,
  initiateVerification,
  verifyStudent,
  rejectStudent,
  getVerificationHistory
} = require('../controllers/studentVerificationController');
const { protect } = require('../middleware/auth');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// All routes are protected
router.use(protect);

// Student routes
router.get('/', (req, res, next) => {
  console.log('GET /students');
  next();
}, getStudents);

router.post('/', (req, res, next) => {
  console.log('POST /students');
  next();
}, createStudent);

// ─── Phase H: Verification queue (MUST be before /:id to avoid capture) ──────
// GET /api/students/verification/queue  — admin only, enforced in service
router.get('/verification/queue', getVerificationQueue);

// Student applications route (mounted before /:id)
router.get('/:studentId/applications', getStudentApplications);
router.get('/:id/applications', getStudentApplications);

router.get('/:id', (req, res, next) => {
  console.log('GET /students/:id', req.params.id);
  next();
}, getStudent);

router.put('/:id', (req, res, next) => {
  console.log('PUT /students/:id', req.params.id);
  next();
}, updateStudent);

router.patch('/:id/status', (req, res, next) => {
  console.log('PATCH /students/:id/status', req.params.id);
  next();
}, updateStudentStatus);

router.delete('/:id', (req, res, next) => {
  console.log('DELETE /students/:id', req.params.id);
  next();
}, deleteStudent);

// Document routes (must come after student routes to avoid conflicts)
router.post('/:id/documents', upload.single('file'), uploadDocument);
router.post('/:id/documents/:docId/resubmit', upload.single('file'), uploadDocument);
router.post('/:id/documents/request', requestDocument);
router.get('/:id/documents/:docId', downloadDocument);
router.patch('/:id/documents/:docId/verify', verifyStudentDocument);
router.patch('/:id/documents/:docId/review', verifyStudentDocument);

// ─── Phase H: Per-student verification routes ─────────────────────────────────
// GET /api/students/:id/verification
router.get('/:id/verification', getVerificationDetail);

// GET /api/students/:id/verification/history
router.get('/:id/verification/history', getVerificationHistory);

// PATCH /api/students/:id/verification/initiate
router.patch('/:id/verification/initiate', initiateVerification);

// PATCH /api/students/:id/verification/verify
router.patch('/:id/verification/verify', verifyStudent);

// PATCH /api/students/:id/verification/reject
router.patch('/:id/verification/reject', rejectStudent);

module.exports = router;
