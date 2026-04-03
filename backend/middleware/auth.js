const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in cookies first
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }
    // Then check Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        detail: 'Not authenticated. Please login.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check token type
      if (decoded.type !== 'access') {
        return res.status(401).json({
          success: false,
          detail: 'Invalid token type'
        });
      }

      // Get user from database
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          detail: 'User not found'
        });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          detail: 'Token expired'
        });
      }
      return res.status(401).json({
        success: false,
        detail: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        detail: `Access denied. ${roles.join(' or ')} role required.`
      });
    }
    next();
  };
};

// Generate Access Token
exports.generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

// Generate Refresh Token
exports.generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Set token cookies
exports.setTokenCookies = (res, accessToken, refreshToken) => {
  // Access token cookie - 15 minutes
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  });

  // Refresh token cookie - 7 days
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
};

// Clear token cookies
exports.clearTokenCookies = (res) => {
  res.cookie('access_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
  res.cookie('refresh_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });
};
