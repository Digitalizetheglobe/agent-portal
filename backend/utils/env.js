// Startup checks for secrets and settings. A server with a missing or guessable secret must not
// start: in production every problem is fatal, in development problems that only weaken security are
// warnings so a fresh checkout still runs.

const PLACEHOLDER = /^(change[-_ ]?me|secret|your[-_ ]|example|test|dev|password|jwt|todo|xxx)/i;

const checkEnvironment = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const fatal = [];
  const warn = [];

  const secret = process.env.JWT_SECRET || '';
  if (!secret) {
    fatal.push('JWT_SECRET is not set. Generate one: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  } else if (secret.length < 32 || PLACEHOLDER.test(secret)) {
    fatal.push('JWT_SECRET is too short or looks like a placeholder (use at least 32 random characters).');
  }

  if (!process.env.DB_NAME) warn.push('DB_NAME is not set (using the default "agent_portal").');
  if (!process.env.DB_PASSWORD) {
    (isProd ? fatal : warn).push('DB_PASSWORD is not set.');
  } else if (isProd && process.env.DB_PASSWORD.length < 12) {
    warn.push('DB_PASSWORD is shorter than 12 characters. Use a long random database password in production.');
  }

  if (isProd) {
    const front = process.env.FRONTEND_URL || '';
    if (!front) fatal.push('FRONTEND_URL is not set (needed for CORS and email links).');
    else if (front.split(',').some((u) => !/^https:\/\//i.test(u.trim()))) {
      warn.push('FRONTEND_URL is not https. Cookies and logins should only travel over HTTPS.');
    }
    if (!process.env.TRUST_PROXY) {
      warn.push('TRUST_PROXY is not set. Behind a proxy or load balancer set it (usually 1) so rate limiting sees real client IPs.');
    }
    if (process.env.SMTP_HOST && process.env.SMTP_SECURE !== 'true' && Number(process.env.SMTP_PORT) === 465) {
      warn.push('SMTP_PORT is 465 but SMTP_SECURE is not true.');
    }
  }

  warn.forEach((m) => console.warn(`⚠️  ${m}`));

  if (fatal.length) {
    fatal.forEach((m) => console.error(`❌ ${m}`));
    if (isProd) {
      console.error('Refusing to start in production with the problems above.');
      process.exit(1);
    }
    console.warn('⚠️  Continuing in development only. Fix the problems above before deploying.');
  }
};

module.exports = { checkEnvironment };
