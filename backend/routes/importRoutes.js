const express = require('express');
const router = express.Router();
const { importUniversities, importPrograms } = require('../controllers/importController');
const { protect, restrictToSuperAdminOr } = require('../middleware/auth');

// Bulk import is for the people who manage the university catalog
router.use(protect);
router.post('/universities', restrictToSuperAdminOr('head_admission'), importUniversities);
router.post('/programs', restrictToSuperAdminOr('head_admission'), importPrograms);

module.exports = router;
