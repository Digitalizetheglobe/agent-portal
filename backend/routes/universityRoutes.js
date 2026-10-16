const express = require('express');
const router = express.Router();
const {
  createUniversity,
  getUniversities,
  getUniversityById,
  updateUniversity,
  updateUniversityStatus,
  deleteUniversity,
  getUniversityApplications,
  uploadLogo
} = require('../controllers/universityController');
const {
  getCourses,
  addBrochure,
  removeBrochure,
  downloadBrochure,
  listUpdates,
  createUpdate,
  updateUpdate,
  deleteUpdate
} = require('../controllers/universityContentController');
const { protect, restrictTo, restrictToSuperAdminOr } = require('../middleware/auth');
const multer = require('multer');

// Brochures: PDF or image, up to 15MB
const brochureUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, JPG or PNG files are allowed'));
  }
});

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only PNG, JPG, GIF or WebP images are allowed'));
  }
});

// All routes are protected by authentication
router.use(protect);

// Accessible by both Admin and Agent
router.get('/', getUniversities);
router.get('/:id/applications', getUniversityApplications);
router.get('/:id/courses', getCourses);
router.get('/:id/brochures/:brochureId', downloadBrochure);
router.get('/:id/updates', listUpdates);
router.get('/:id', getUniversityById);

// Admin-only management routes
router.post('/logo', restrictToSuperAdminOr('head_admission'), logoUpload.single('file'), uploadLogo);
router.post('/', restrictToSuperAdminOr('head_admission'), createUniversity);
router.put('/:id', restrictToSuperAdminOr('head_admission'), updateUniversity);
router.patch('/:id/status', restrictToSuperAdminOr('head_admission'), updateUniversityStatus);
router.delete('/:id', restrictToSuperAdminOr('head_admission'), deleteUniversity);

// Brochures, news and scholarship updates: published by the Head of Admission, read by everyone
router.post('/:id/brochures', restrictToSuperAdminOr('head_admission'), brochureUpload.single('file'), addBrochure);
router.delete('/:id/brochures/:brochureId', restrictToSuperAdminOr('head_admission'), removeBrochure);
router.post('/:id/updates', restrictToSuperAdminOr('head_admission'), createUpdate);
router.put('/:id/updates/:updateId', restrictToSuperAdminOr('head_admission'), updateUpdate);
router.delete('/:id/updates/:updateId', restrictToSuperAdminOr('head_admission'), deleteUpdate);

module.exports = router;
