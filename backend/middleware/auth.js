const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { setAuditActor } = require('../utils/audit');

// True when the token was issued before the user's password last changed (iat is in whole seconds)
const isTokenStale = (decoded, user) => {
  if (!user.passwordChangedAt || !decoded.iat) return false;
  return decoded.iat < Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
};
exports.isTokenStale = isTokenStale;

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

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

      // A deactivated account loses access immediately, not when its token expires
      if (user.status === 'inactive') {
        return res.status(403).json({
          success: false,
          detail: 'Your account is inactive. Please contact admin.'
        });
      }

      // Sessions issued before the last password change are no longer valid
      if (isTokenStale(decoded, user)) {
        return res.status(401).json({
          success: false,
          detail: 'Session expired. Please login again.'
        });
      }

      // Attach user to request
      req.user = user;
      // So the audit log knows who made any change during this request
      setAuditActor(user);
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

const STAFF_ROLES = ['account_manager', 'head_recruitment', 'head_admission', 'accounts'];
exports.STAFF_ROLES = STAFF_ROLES;

const deny = (res, detail) => res.status(403).json({ success: false, detail });

// Restrict to admin users holding one of the given staff roles.
// Super admins (no staffRole) always pass; staff roles are limited to their own area.
exports.restrictToStaffRole = (...staffRoles) => {
  return (req, res, next) => {
    const { role, staffRole } = req.user;
    if (role === 'admin' && (!staffRole || staffRoles.includes(staffRole))) return next();
    return deny(res, `Access denied. ${staffRoles.join(' or ')} role required.`);
  };
};

// Super admins (no staffRole) plus admin users holding one of the given staff roles.
// With no arguments, super admin only (system configuration).
exports.restrictToSuperAdminOr = (...staffRoles) => {
  return (req, res, next) => {
    const { role, staffRole } = req.user;
    if (role === 'admin' && (!staffRole || staffRoles.includes(staffRole))) return next();
    return deny(res, staffRoles.length
      ? `Access denied. Super admin or ${staffRoles.join(' or ')} role required.`
      : 'Access denied. Super admin role required.');
  };
};

// For routes shared by agents and staff: agents pass through (the service enforces
// ownership); admin users must be super admin or hold one of the given staff roles.
exports.allowStaff = (...staffRoles) => {
  return (req, res, next) => {
    const { role, staffRole } = req.user;
    if (role === 'agent') return next();
    if (role === 'admin' && (!staffRole || staffRoles.includes(staffRole))) return next();
    return deny(res, `Access denied. ${staffRoles.join(' or ')} role required.`);
  };
};

// Agents may submit students only once QStudy has activated them
// (contract signed + E-Certificate issued). Staff pass through.
exports.requireActivatedAgent = (req, res, next) => {
  if (req.user.role === 'agent' && !req.user.isActivated) {
    return deny(res, 'Your account is not active yet. QStudy will activate it once your contract is signed and your E-Certificate is issued.');
  }
  next();
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
// Cookie attributes. When the front end and API are on different sites (production default here)
// the browser only sends the cookie with SameSite=None; set COOKIE_SAMESITE=strict or lax when they
// share a site. Cross-site request forgery is blocked separately by originCheck in utils/security.js.
const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const configured = String(process.env.COOKIE_SAMESITE || '').toLowerCase();
  const sameSite = ['strict', 'lax', 'none'].includes(configured) ? configured : (isProd ? 'none' : 'lax');
  return { httpOnly: true, secure: isProd || sameSite === 'none', sameSite, path: '/' };
};
exports.cookieOptions = cookieOptions;

exports.setTokenCookies = (res, accessToken, refreshToken) => {
  // Access token cookie - 15 minutes
  res.cookie('access_token', accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 });

  // Refresh token cookie - 7 days
  res.cookie('refresh_token', refreshToken, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
};

// Clear token cookies
exports.clearTokenCookies = (res) => {
  res.cookie('access_token', '', { ...cookieOptions(), expires: new Date(0) });
  res.cookie('refresh_token', '', { ...cookieOptions(), expires: new Date(0) });
};
