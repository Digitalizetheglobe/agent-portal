const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

// ── Allowed browser origins (CORS + CSRF origin check) ──
// FRONTEND_URL may hold several origins separated by commas. In development localhost is always allowed.
const getAllowedOrigins = () => {
  const list = String(process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (process.env.NODE_ENV !== 'production') {
    list.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  // Allow Vercel deployment domains by default
  list.push('https://*.vercel.app');
  return [...new Set(list)];
};

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/+$/, '');
  const allowed = getAllowedOrigins();
  if (allowed.includes(cleanOrigin) || allowed.includes('*')) return true;
  return allowed.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return regex.test(cleanOrigin);
    }
    return false;
  });
};

// ── Passwords ──
// bcrypt only reads the first 72 bytes, so longer passwords add nothing and are refused.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'admin123', 'admin1234', 'agent123', 'qwerty123',
  'letmein123', 'welcome123', '12345678', '123456789', '1234567890', 'iloveyou1', 'qstudy123'
]);

// Returns an error message, or null when the password is acceptable.
const passwordProblem = (password) => {
  if (typeof password !== 'string') return 'Password is required';
  if (password.length < 10) return 'Password must be at least 10 characters long';
  if (Buffer.byteLength(password, 'utf8') > 72) return 'Password must be at most 72 bytes long';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain at least one letter and one number';
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'That password is too common. Choose a different one';
  return null;
};

// Throws a 400 error for a weak password (used by model hooks and controllers).
const assertStrongPassword = (password) => {
  const problem = passwordProblem(password);
  if (problem) {
    const err = new Error(problem);
    err.statusCode = 400;
    throw err;
  }
};

// ── Tokens that are only ever stored hashed ──
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// ── Request sanitising ──
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_STRING = 20000;
const MAX_DEPTH = 8;

// Removes NUL / control characters, refuses prototype-pollution keys and absurd nesting or sizes.
// Text is stored as typed and escaped where it is shown (React, escapeHtml in emails), so no
// characters are stripped from normal text: that would corrupt legitimate names and notes.
const cleanValue = (value, depth = 0) => {
  if (depth > MAX_DEPTH) {
    const err = new Error('Request is too deeply nested');
    err.statusCode = 400;
    throw err;
  }
  if (typeof value === 'string') {
    if (value.length > MAX_STRING) {
      const err = new Error('A field in the request is too long');
      err.statusCode = 400;
      throw err;
    }
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }
  if (Array.isArray(value)) return value.map((v) => cleanValue(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        const err = new Error('Invalid request');
        err.statusCode = 400;
        throw err;
      }
      out[key] = cleanValue(value[key], depth + 1);
    }
    return out;
  }
  return value;
};

const sanitizeRequest = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') req.body = cleanValue(req.body);
    if (req.query && typeof req.query === 'object') {
      const cleaned = cleanValue(req.query);
      // req.query is a getter in newer Express versions; overwrite in place so either works
      for (const k of Object.keys(req.query)) delete req.query[k];
      Object.assign(req.query, cleaned);
    }
    if (req.params && typeof req.params === 'object') {
      for (const k of Object.keys(req.params)) req.params[k] = cleanValue(req.params[k]);
    }
    next();
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, detail: err.message });
  }
};

// ── Download file names ──
// Several controllers build `Content-Disposition: attachment; filename="<user file name>"`.
// A quote, backslash, line break or non-ASCII character in that name could break out of the header
// or be rejected by Node, so the name is cleaned in one place for all of them.
const safeDisposition = (req, res, next) => {
  const original = res.setHeader.bind(res);
  res.setHeader = (name, value) => {
    if (String(name).toLowerCase() === 'content-disposition' && typeof value === 'string') {
      const m = value.match(/^\s*(inline|attachment)\s*;\s*filename="([\s\S]*)"\s*$/i);
      if (m) {
        const ascii = m[2].replace(/[\r\n"\\]/g, '_').replace(/[^\x20-\x7e]/g, '_').slice(0, 200) || 'download';
        const utf8 = encodeURIComponent(m[2].replace(/[\r\n]/g, ' ').slice(0, 200));
        return original(name, `${m[1].toLowerCase()}; filename="${ascii}"; filename*=UTF-8''${utf8}`);
      }
    }
    return original(name, value);
  };
  next();
};

// ── CSRF defence ──
// Sign-in cookies are sent automatically by the browser, so a request changing data must come from
// our own front end. Browsers always attach an Origin header to cross-site POST/PUT/PATCH/DELETE;
// when it is present it has to be one of ours. Requests with no Origin (curl, server to server)
// carry no browser cookies of a victim and are handled by normal authentication.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const originCheck = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  if (isOriginAllowed(origin)) return next();
  return res.status(403).json({ success: false, detail: 'Request origin not allowed' });
};

// ── Rate limits ──
const limiterResponse = (detail) => (req, res) =>
  res.status(429).json({ success: false, detail });

const make = (options) => rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  ...options
});

// Everything under /api
const apiLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API) || 1000,
  handler: limiterResponse('Too many requests. Please slow down and try again shortly.')
});

// Login: counted per IP + email so one attacker cannot lock a victim out from another address,
// and successful logins do not use up the allowance.
const loginLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_LOGIN) || 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email || '').toLowerCase().trim().slice(0, 100)}`,
  handler: limiterResponse('Too many failed sign-in attempts. Try again in 15 minutes.')
});

// Sign-in attempts from one IP across all emails (credential stuffing)
const loginIpLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_LOGIN_IP) || 50,
  skipSuccessfulRequests: true,
  handler: limiterResponse('Too many failed sign-in attempts. Try again in 15 minutes.')
});

// Forgot / reset password, invite look-ups and registration: they send email or guess tokens
const sensitiveLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_SENSITIVE) || 20,
  handler: limiterResponse('Too many attempts. Please try again later.')
});

const refreshLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  handler: limiterResponse('Too many requests. Please try again later.')
});

module.exports = {
  getAllowedOrigins,
  isOriginAllowed,
  passwordProblem,
  assertStrongPassword,
  hashToken,
  sanitizeRequest,
  safeDisposition,
  originCheck,
  apiLimiter,
  loginLimiter,
  loginIpLimiter,
  sensitiveLimiter,
  refreshLimiter
};
