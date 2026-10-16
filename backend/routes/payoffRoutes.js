const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getPayoffs,
  getPayoff,
  settlePayoff,
  cancelPayoff,
  recordUniversityPayment,
  authorizeBypass,
  downloadSlip
} = require('../controllers/payoffController');
const { protect, restrictToStaffRole } = require('../middleware/auth');

// Payment slip: a scan or photo, up to 10MB
const slipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Upload a PDF, JPG or PNG.'), false);
  }
});

// All payoff routes require authentication
router.use(protect);

// Collection listing (Admin sees all, Agent sees own)
router.get('/', getPayoffs);

// Single payoff details
router.get('/:id', getPayoff);

// Payment slip (the agent who owns the payoff, and staff)
router.get('/:id/slip', downloadSlip);

// The agent is paid only after the university has paid QStudy.
// Accounts or the Head of Admission record that payment; only the Head of Admission may allow an exception.
router.patch('/:id/university-payment', restrictToStaffRole('accounts', 'head_admission'), recordUniversityPayment);
router.patch('/:id/bypass-block', restrictToStaffRole('head_admission'), authorizeBypass);

// Settlement (with the payment slip) and cancellation: Accounts
router.patch('/:id/settle', restrictToStaffRole('accounts'), slipUpload.single('slip'), settlePayoff);
router.patch('/:id/cancel', restrictToStaffRole('accounts'), cancelPayoff);

module.exports = router;
