const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  getStudents, 
  getStudent, 
  createStudent, 
  uploadDocument, 
  downloadDocument 
} = require('../controllers/studentController');
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
router.get('/', getStudents);
router.get('/:id', getStudent);
router.post('/', createStudent);

// Document routes
router.post('/:id/documents', upload.single('file'), uploadDocument);
router.get('/:id/documents/:docId', downloadDocument);

module.exports = router;
