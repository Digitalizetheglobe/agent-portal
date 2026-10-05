const express = require('express');
const router = express.Router();
const {
  getPayoffs,
  getPayoff,
  settlePayoff,
  cancelPayoff
} = require('../controllers/payoffController');
const { protect, restrictTo } = require('../middleware/auth');

// All payoff routes require authentication
router.use(protect);

// Collection listing (Admin sees all, Agent sees own)
router.get('/', getPayoffs);

// Single payoff details
router.get('/:id', getPayoff);

// Admin-only settlement and cancellation actions
router.patch('/:id/settle', restrictTo('admin'), settlePayoff);
router.patch('/:id/cancel', restrictTo('admin'), cancelPayoff);

module.exports = router;
