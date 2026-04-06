const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { generateAccessToken, generateRefreshToken, setTokenCookies, clearTokenCookies } = require('../middleware/auth');
const { sendEmail, templates } = require('../utils/email');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        detail: 'Please provide email and password'
      });
    }

    // Find user by email (include password for verification)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        detail: 'Invalid credentials'
      });
    }

    // Check if role matches user's role (if role is provided)
    if (role && user.role !== role) {
      return res.status(401).json({
        success: false,
        detail: `Invalid credentials for ${role} account`
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        detail: 'Invalid credentials'
      });
    }

    // Check if agent is inactive
    if (user.role === 'agent' && user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        detail: 'Your account is inactive. Please contact admin.'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Return user data (without password)
    res.status(200).json(user.toJSON());
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    clearTokenCookies(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json(user.toJSON());
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (with refresh token)
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        detail: 'Refresh token not found'
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          detail: 'Invalid token type'
        });
      }

      // Find user
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          detail: 'User not found'
        });
      }

      // Generate new access token
      const accessToken = generateAccessToken(user);

      // Set new access token cookie
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/'
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          detail: 'Refresh token expired'
        });
      }
      return res.status(401).json({
        success: false,
        detail: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        detail: 'Please provide email'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');

      // Save token to database
      await PasswordResetToken.create({
        userId: user._id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      });

      // Generate reset link
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      // Send email
      const emailTemplate = templates.passwordReset(resetLink);
      await sendEmail(email, emailTemplate.subject, emailTemplate.html);

      console.log(`🔐 Password reset link: ${resetLink}`);
    }

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If email exists, a reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({
        success: false,
        detail: 'Please provide token and new password'
      });
    }

    // Find valid token
    const resetToken = await PasswordResetToken.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        detail: 'Invalid or expired token'
      });
    }

    // Update user password
    const user = await User.findById(resetToken.userId);
    user.password = new_password;
    await user.save();

    // Mark token as used
    resetToken.used = true;
    await resetToken.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};
