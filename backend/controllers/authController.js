const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, PasswordResetToken } = require('../models');
const { generateAccessToken, generateRefreshToken, setTokenCookies, clearTokenCookies, cookieOptions, isTokenStale } = require('../middleware/auth');
const { passwordProblem, hashToken } = require('../utils/security');
const bcrypt = require('bcryptjs');
const { sendEmail, templates, isEmailConfigured } = require('../utils/email');
const { pickApplicationFields, validateApplication, IN_REVIEW_STATUSES } = require('../utils/agentApplication');

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

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        detail: 'Please provide email and password'
      });
    }

    // Find user by email
    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() }
    });

    // Always run one bcrypt comparison, even for an unknown email, so the response time does not
    // reveal whether the account exists. Every failure below returns the same message.
    let isMatch = false;
    if (user) {
      isMatch = await user.comparePassword(password);
    } else {
      await bcrypt.compare(password, User.DUMMY_HASH);
    }

    // A wrong password, an unknown email and a wrong portal (role) all look identical
    if (!user || !isMatch || (role && user.role !== role)) {
      return res.status(401).json({
        success: false,
        detail: 'Invalid credentials'
      });
    }

    // Check if the account is inactive (agents and staff alike)
    if (user.status === 'inactive') {
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

    // Return user data and tokens
    res.status(200).json({
      ...user.toJSON(),
      accessToken,
      refreshToken
    });
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
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, detail: 'User not found' });
    }
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
    let refreshToken = (req.cookies && req.cookies.refresh_token) || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        detail: 'Refresh token not found'
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          detail: 'Invalid token type'
        });
      }

      // Find user
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          detail: 'User not found'
        });
      }

      // Deactivated accounts and sessions from before a password change cannot refresh
      if (user.status === 'inactive' || isTokenStale(decoded, user)) {
        clearTokenCookies(res);
        return res.status(401).json({
          success: false,
          detail: 'Session expired. Please login again.'
        });
      }

      // Generate new access token
      const accessToken = generateAccessToken(user);

      // Set new access token cookie
      res.cookie('access_token', accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 });

      res.status(200).json({
        success: true,
        message: 'Token refreshed',
        accessToken
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

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        detail: 'Please provide email'
      });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() }
    });

    if (user && user.status !== 'inactive') {
      // Only the newest link works
      await PasswordResetToken.update({ used: true }, { where: { userId: user.id, used: false } });

      // Generate reset token. Only its SHA-256 hash is stored, so a database leak cannot be used to
      // reset anyone's password; the plain token exists only in the email.
      const token = crypto.randomBytes(32).toString('hex');

      await PasswordResetToken.create({
        userId: user.id,
        token: hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      });

      // Generate reset link
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      // Send email. A delivery problem must not change the response: the endpoint answers the same
      // for every address, so an error here would reveal which emails are registered.
      try {
        const emailTemplate = templates.passwordReset(resetLink);
        await sendEmail(user.email, emailTemplate.subject, emailTemplate.html);
      } catch (emailErr) {
        console.error('Password reset email failed:', emailErr.message);
      }

      // Only in development (no email provider): the link would otherwise be unreachable.
      // With real email the link is never written to the log.
      if (!isEmailConfigured() && process.env.NODE_ENV !== 'production') {
        console.log(`🔐 Password reset link: ${resetLink}`);
      }
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

    if (!token || !new_password || typeof token !== 'string' || typeof new_password !== 'string') {
      return res.status(400).json({
        success: false,
        detail: 'Please provide token and new password'
      });
    }

    const weak = passwordProblem(new_password);
    if (weak) {
      return res.status(400).json({ success: false, detail: weak });
    }

    // Find valid token (stored hashed)
    const resetToken = await PasswordResetToken.findOne({
      where: {
        token: hashToken(token),
        used: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        detail: 'Invalid or expired token'
      });
    }

    // Update user password
    const user = await User.findByPk(resetToken.userId);
    if (!user) {
      return res.status(404).json({ success: false, detail: 'User not found' });
    }
    user.password = new_password;
    await user.save();

    // Mark this token (and any other open one) as used
    await PasswordResetToken.update({ used: true }, { where: { userId: user.id, used: false } });

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

// @desc    Update current user profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phone: req.body.phone,
      agencyName: req.body.agencyName,
      businessRegistrationNumber: req.body.businessRegistrationNumber,
      fullAddress: req.body.fullAddress
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, detail: 'User not found' });
    }

    // Agents can also maintain the rest of their application details (incl. bank details)
    if (user.role === 'agent') {
      const appFields = pickApplicationFields(req.body);
      if (Object.keys(appFields).length && IN_REVIEW_STATUSES.includes(user.onboardingStatus)) {
        return res.status(403).json({
          success: false,
          detail: 'Your application is under review. Details cannot be changed until it is returned to you.'
        });
      }
      const errors = validateApplication(appFields, { mode: 'update', existing: user.toJSON() });
      if (errors.length) {
        return res.status(400).json({ success: false, detail: errors.join('. ') });
      }
      Object.assign(fieldsToUpdate, appFields);
    }

    await user.update(fieldsToUpdate);

    res.status(200).json(user.toJSON());
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      detail: error.statusCode ? error.message : 'Server error'
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password || typeof current_password !== 'string' || typeof new_password !== 'string') {
      return res.status(400).json({
        success: false,
        detail: 'Please provide current and new password'
      });
    }

    const weak = passwordProblem(new_password);
    if (weak) {
      return res.status(400).json({ success: false, detail: weak });
    }
    if (new_password === current_password) {
      return res.status(400).json({ success: false, detail: 'The new password must be different from the current one' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, detail: 'User not found' });
    }

    // Check current password
    const isMatch = await user.comparePassword(current_password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        detail: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = new_password;
    await user.save();

    // Every older session is now invalid; give this one a fresh pair so the user stays signed in
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};
