const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  getAgents, 
  getAgent, 
  createAgent, 
  createAdmin,
  updateAgent, 
  deleteAgent,
  uploadVerificationDocument,
  verifyAgent,
  downloadVerificationDocument
} = require('../controllers/agentController');
const { protect, restrictTo } = require('../middleware/auth');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
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

// Routes accessible by all authenticated users
router.get('/', getAgents);
router.get('/:id', getAgent);

// Admin only routes
router.post('/', restrictTo('admin'), createAgent);
router.post('/admin', restrictTo('admin'), createAdmin);
router.put('/:id', restrictTo('admin'), updateAgent);
router.delete('/:id', restrictTo('admin'), deleteAgent);
router.patch('/:id/verify', restrictTo('admin'), verifyAgent);
router.get('/:id/documents/:docId', downloadVerificationDocument);

// Agent specific routes
router.post('/me/documents', restrictTo('agent'), upload.single('file'), uploadVerificationDocument);

module.exports = router;
