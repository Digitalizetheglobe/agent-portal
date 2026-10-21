const express = require('express');
const router = express.Router();
const { 
  login, 
  logout, 
  getMe, 
  refreshToken, 
  forgotPassword, 
  resetPassword,
  updateProfile,
  updatePassword 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/update-password', protect, updatePassword);

module.exports = router;
