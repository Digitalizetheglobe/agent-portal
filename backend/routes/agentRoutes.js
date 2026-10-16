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
  deleteVerificationDocument,
  verifyAgent,
  getAccountManagers,
  downloadVerificationDocument
} = require('../controllers/agentController');
const { submitOnboarding, reviewOnboarding, acceptDeclaration } = require('../controllers/agentReviewController');
const {
  issueContract,
  uploadSignedContract,
  uploadOwnSignedContract,
  issueCertificate,
  downloadContractFile
} = require('../controllers/agentContractController');
const { protect, restrictTo, restrictToStaffRole, restrictToSuperAdminOr } = require('../middleware/auth');

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

// Agent own-profile route (mounted before /:id)
router.get('/me', (req, res) => {
  res.status(200).json(req.user.toJSON ? req.user.toJSON() : req.user);
});

// Admin only routes
router.get('/', restrictTo('admin'), getAgents);
router.get('/account-managers', restrictTo('admin'), getAccountManagers);
router.get('/:id', getAgent);

// Admin only routes
router.post('/', restrictToSuperAdminOr('account_manager', 'head_recruitment'), createAgent);
router.post('/admin', restrictToSuperAdminOr(), createAdmin);
router.put('/:id', restrictToSuperAdminOr('account_manager', 'head_recruitment', 'head_admission'), updateAgent);
router.delete('/:id', restrictToSuperAdminOr(), deleteAgent);
router.patch('/:id/verify', restrictToStaffRole('head_recruitment', 'head_admission'), verifyAgent);
router.get('/:id/documents/:docId', downloadVerificationDocument);

// Contract + E-Certificate (after approval): issued by the Head of Admission (and super admin).
// Declared before the /:id routes so "me" is not read as an agent id
router.post('/me/contract/signed', restrictTo('agent'), upload.single('file'), uploadOwnSignedContract);
const contractStaff = restrictToSuperAdminOr('head_admission');
router.post('/:id/contract/issue', contractStaff, upload.single('file'), issueContract);
router.post('/:id/contract/signed', contractStaff, upload.single('file'), uploadSignedContract);
router.post('/:id/certificate', contractStaff, upload.single('file'), issueCertificate);
router.get('/:id/contract/:docId', downloadContractFile);

// Agent specific routes
router.post('/me/onboarding/submit', restrictTo('agent'), submitOnboarding);
router.post('/me/declaration', restrictTo('agent'), acceptDeclaration);
// Per-action role checks (and Account Manager ownership) are enforced in the controller
router.patch('/:id/onboarding/:action', restrictToSuperAdminOr('account_manager', 'head_recruitment', 'head_admission'), reviewOnboarding);
router.post('/me/documents', restrictTo('agent'), upload.single('file'), uploadVerificationDocument);
router.delete('/me/documents/:docId', restrictTo('agent'), deleteVerificationDocument);

module.exports = router;
