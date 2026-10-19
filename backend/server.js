require('dotenv').config();
// Local secrets (email password, API keys): backend/.env.local overrides .env and is never committed
require('dotenv').config({ path: require('path').join(__dirname, '.env.local'), override: true });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const { checkEnvironment } = require('./utils/env');
const {
  getAllowedOrigins, sanitizeRequest, safeDisposition, originCheck, passwordProblem,
  apiLimiter, loginLimiter, loginIpLimiter, sensitiveLimiter, refreshLimiter
} = require('./utils/security');

// Refuse to start with missing or weak secrets (before anything connects or listens)
checkEnvironment();

const { connectDB, sequelize } = require('./config/db');
const { initStorage } = require('./utils/storage');

// Import models to ensure associations are registered
const { User, Student, University, Course, CommissionSnapshot, Payoff, Application } = require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const newsRoutes = require('./routes/newsRoutes');
const studentRoutes = require('./routes/studentRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const statsRoutes = require('./routes/statsRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const universityRoutes = require('./routes/universityRoutes');
const invoiceReviewRoutes = require('./routes/invoiceReviewRoutes');
const courseRoutes = require('./routes/courseRoutes');
const payoffRoutes = require('./routes/payoffRoutes');
const auditRoutes = require('./routes/auditRoutes');
const searchRoutes = require('./routes/searchRoutes');
const chatRoutes = require('./routes/chatRoutes');
const staffRoutes = require('./routes/staffRoutes');

const app = express();

// Behind a reverse proxy / load balancer set TRUST_PROXY to the number of proxies (usually 1) so
// rate limits see the real client address. Left off by default: trusting the header without a proxy
// would let anyone fake their IP.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY === 'true' : hops);
}
app.disable('x-powered-by');

// Security headers. This server only returns JSON and files, never pages, so the policy is strict.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: false }
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});

// CORS: only our own front end(s) may call the API from a browser
const frontendUrl = getAllowedOrigins()[0];
const allowedOrigins = getAllowedOrigins();
app.use(cors({
  origin: (origin, callback) => {
    // No Origin header = not a browser (curl, server to server): CORS does not apply
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));

// Body parsing with size limits (file uploads go through multer with its own limits)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 200 }));
app.use(cookieParser());
app.use(hpp());
app.use(sanitizeRequest);
app.use(safeDisposition);
// Cookie-signed-in requests that change data must come from our own front end (CSRF)
app.use(originCheck);
// Keeps the current request available to the audit log (who changed what)
app.use(require('./utils/audit').auditContext);

// Rate limits: a general one for the whole API, tighter ones where guessing or email sending is possible
app.use('/api', apiLimiter);
app.post('/api/auth/login', loginIpLimiter, loginLimiter);
app.post('/api/auth/refresh', refreshLimiter);
app.use('/api/auth/forgot-password', sensitiveLimiter);
app.use('/api/auth/reset-password', sensitiveLimiter);
app.use('/api/onboarding', sensitiveLimiter);

// Publicly served university logos (only this subfolder of uploads is exposed)
app.use('/uploads/university-logos', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(require('path').join(__dirname, 'uploads', 'university-logos')));

// Publicly served news media (only this subfolder of uploads is exposed)
app.use('/uploads/news-media', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(require('path').join(__dirname, 'uploads', 'news-media')));

// Health check routes (before /api prefix)
app.get('/api', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/invoice-reviews', invoiceReviewRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payoffs', payoffRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/staff', staffRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  // Invalid JSON, oversized bodies and blocked cross-origin requests are the caller's mistake
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, detail: 'Malformed request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, detail: 'Request body too large' });
  }

  console.error('Error:', req.method, req.path, err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      detail: 'File too large. Maximum size is 10MB.'
    });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, detail: 'Upload failed. Check the file and try again.' });
  }

  if (err.message === 'Invalid file type') {
    return res.status(400).json({
      success: false,
      detail: 'Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG, GIF, TXT, CSV'
    });
  }

  // Errors raised on purpose carry a status code and a message meant for the user. Anything else is
  // an unexpected failure: its text (SQL, file paths) stays in the server log.
  const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
  res.status(status).json({
    success: false,
    detail: status < 500 ? err.message : 'Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    detail: 'Route not found'
  });
});

// Database seeding function
const generatePassword = () => crypto.randomBytes(15).toString('base64url') + 'a1';

const seedDatabase = async () => {
  console.log('🌱 Starting database seeding...');

  try {
    // Check and create the first admin. The password must come from the environment (ADMIN_PASSWORD);
    // there is no built-in default. Without it, an admin is created only outside production, with a
    // random password printed once.
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
    const isProd = process.env.NODE_ENV === 'production';

    let admin = await User.findOne({ where: { email: adminEmail } });

    if (!admin) {
      let adminPassword = process.env.ADMIN_PASSWORD;
      let generated = false;
      if (adminPassword) {
        const weak = passwordProblem(adminPassword);
        if (weak) {
          console.error(`❌ ADMIN_PASSWORD rejected: ${weak}. Admin not created.`);
          adminPassword = null;
        }
      } else if (!isProd) {
        adminPassword = generatePassword();
        generated = true;
      } else {
        console.warn('⚠️  No admin exists and ADMIN_PASSWORD is not set. Create one with: npm run create-admin');
      }

      if (adminPassword) {
        admin = await User.create({
          name: 'Super Admin',
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          status: 'active',
          isVerified: true,
          verificationStatus: 'approved'
        });
        console.log(`✅ Admin created: ${adminEmail}`);
        if (generated) {
          console.log(`🔑 Development admin password (shown once, change it): ${adminPassword}`);
        }
      }
    } else {
      console.log(`ℹ️ Admin already exists: ${adminEmail}`);
    }

    // Sample agents and students: development only, and only when asked for (SEED_SAMPLE_DATA=true).
    // Never in production. Their passwords are random, so there are no well-known logins.
    const agentCount = await User.count({ where: { role: 'agent' } });

    if (agentCount === 0 && !isProd && process.env.SEED_SAMPLE_DATA === 'true') {
      console.log('📝 Seeding sample data...');

      const agentsData = [
        { name: 'John Smith', email: 'john.smith@example.com', userId: 'john.smith', phone: '+1 234 567 8901', status: 'active', isVerified: true, verificationStatus: 'approved' },
        { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', userId: 'sarah.johnson', phone: '+1 234 567 8902', status: 'active', isVerified: true, verificationStatus: 'approved' },
        { name: 'Mike Davis', email: 'mike.davis@example.com', userId: 'mike.davis', phone: '+1 234 567 8903', status: 'inactive', isVerified: false, verificationStatus: 'pending' }
      ];

      const agents = [];
      for (const agentData of agentsData) {
        const agent = await User.create({ ...agentData, password: generatePassword(), role: 'agent' });
        agents.push(agent);
      }
      console.log(`✅ Created ${agents.length} sample agents (random passwords: use "Forgot password" to sign in as one)`);

      const studentsData = [
        { name: 'Alice Wang', email: 'alice.wang@email.com', phone: '+86 123 4567 8901', country: 'China', education: "Bachelor's in Computer Science", courseInterested: "Master's in Data Science", notes: 'Interested in AI/ML programs', agentId: agents[0].id },
        { name: 'Raj Patel', email: 'raj.patel@email.com', phone: '+91 987 654 3210', country: 'India', education: "Bachelor's in Engineering", courseInterested: 'MBA', notes: 'Looking for scholarships', agentId: agents[1].id },
        { name: 'Emma Thompson', email: 'emma.t@email.com', phone: '+44 789 012 3456', country: 'United Kingdom', education: 'A-Levels', courseInterested: "Bachelor's in Business", notes: 'Prefers universities in USA', agentId: agents[0].id }
      ];

      for (const studentData of studentsData) {
        await Student.create(studentData);
      }
      console.log(`✅ Created ${studentsData.length} sample students`);
    }

    // Check if we need to seed initial courses
    const courseCount = await Course.count();
    if (courseCount === 0) {
      console.log('📚 Seeding sample courses...');
      const sampleCourses = [
        { name: 'Computer Science', code: 'CS101', level: 'Undergraduate', department: 'Computer Science & IT', duration: '3 Years', tuitionFee: '$18,000 / year', status: 'active', description: 'Comprehensive study of computer systems, algorithms, software development and computation.' },
        { name: 'Data Science & Artificial Intelligence', code: 'DSAI', level: 'Postgraduate', department: 'Computer Science & IT', duration: '2 Years', tuitionFee: '$22,000 / year', status: 'active', description: 'Advanced machine learning, statistical modeling, big data infrastructure, and AI engineering.' },
        { name: 'Master of Business Administration (MBA)', code: 'MBA', level: 'Postgraduate', department: 'Business & Management', duration: '2 Years', tuitionFee: '$26,000 / year', status: 'active', description: 'Executive leadership, global business strategy, corporate finance, and enterprise operations.' },
        { name: 'Software Engineering', code: 'SE201', level: 'Undergraduate', department: 'Engineering', duration: '4 Years', tuitionFee: '$20,000 / year', status: 'active', description: 'Design, architect, and deploy reliable large-scale distributed systems and enterprise software.' },
        { name: 'International Business & Marketing', code: 'IB301', level: 'Undergraduate', department: 'Business & Management', duration: '3 Years', tuitionFee: '$16,500 / year', status: 'active', description: 'Global commerce, multinational supply chain economics, and modern international brand management.' },
        { name: 'Biomedical Science', code: 'BMS', level: 'Undergraduate', department: 'Health & Life Sciences', duration: '3 Years', tuitionFee: '$21,000 / year', status: 'active', description: 'Human pathology, molecular biology, clinical diagnostics, and pharmacology research.' },
        { name: 'Cyber Security & Network Defense', code: 'CSND', level: 'Postgraduate', department: 'Computer Science & IT', duration: '1 Year', tuitionFee: '$19,500 / year', status: 'active', description: 'Cryptographic systems, ethical hacking, digital forensics, and cloud infrastructure security.' },
        { name: 'Mechanical Engineering', code: 'ME101', level: 'Undergraduate', department: 'Engineering', duration: '4 Years', tuitionFee: '$19,000 / year', status: 'active', description: 'Thermodynamics, robotics, mechanical design, aerospace mechanics, and manufacturing.' }
      ];

      for (const c of sampleCourses) {
        await Course.create(c);
      }
      console.log(`✅ Created ${sampleCourses.length} sample courses`);
    }

    console.log('🌱 Database seeding completed!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
};

// Start server
const PORT = process.env.PORT || 8001;

const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await connectDB();

    // Synchronize Sequelize models with database schema
    // "alter" rewrites tables to match the models, which can change or drop data. It runs freely in
    // development; in production it needs DB_SYNC_ALTER=true (set it for one deploy that adds columns).
    const alter = process.env.NODE_ENV !== 'production' || process.env.DB_SYNC_ALTER === 'true';
    // A cancelled payoff can be replaced, so an invoice may have several payoffs (only one active).
    // Drop the old one-payoff-per-invoice uniqueness before sync; the model's partial index replaces it.
    await sequelize.query('ALTER TABLE IF EXISTS "Payoffs" DROP CONSTRAINT IF EXISTS "Payoffs_invoiceId_key"');
    await sequelize.query('DROP INDEX IF EXISTS "unique_invoice_payoff"');
    console.log(`🔄 Synchronizing PostgreSQL database schema (alter: ${alter})...`);
    await sequelize.sync({ alter });
    if (!alter) {
      // Columns added since the last deploy that plain sync cannot create
      const qi = sequelize.getQueryInterface();
      const columns = await qi.describeTable('Users');
      const payoffColumns = await qi.describeTable('Payoffs');
      const { DataTypes } = require('sequelize');
      for (const [name, type] of Object.entries({
        cancelledAt: DataTypes.DATE,
        cancelledBy: DataTypes.UUID,
        cancellationReason: DataTypes.TEXT,
        replacesPayoffId: DataTypes.UUID
      })) {
        if (!payoffColumns[name]) {
          await qi.addColumn('Payoffs', name, { type, allowNull: true });
          console.log(`✅ Added Payoffs.${name}`);
        }
      }
      if (!columns.passwordChangedAt) {
        await qi.addColumn('Users', 'passwordChangedAt', { type: require('sequelize').DataTypes.DATE, allowNull: true });
        console.log('✅ Added Users.passwordChangedAt');
      }
    }
    console.log('✅ PostgreSQL schema synchronized successfully');

    // Say clearly whether notification emails really go out
    const { isEmailConfigured, getEmailProviderName } = require('./utils/email');
    if (isEmailConfigured()) {
      console.log(`📧 Email delivery: ${getEmailProviderName()} (sender: ${process.env.SENDER_EMAIL || 'default'})`);
    } else {
      console.warn('⚠️  Email delivery is OFF (no RESEND_API_KEY or SMTP_HOST). Notification emails are not sent. See backend/.env.example.');
    }

    // One-time backfill for onboarding status: agents that existed before the review flow
    // keep the outcome they already had.
    try {
      const { Op } = require('sequelize');
      const [approved] = await User.update(
        { onboardingStatus: 'approved' },
        { where: { role: 'agent', onboardingStatus: 'draft', [Op.or]: [{ isVerified: true }, { verificationStatus: 'approved' }] } }
      );
      const [rejected] = await User.update(
        { onboardingStatus: 'rejected' },
        { where: { role: 'agent', onboardingStatus: 'draft', verificationStatus: 'rejected' } }
      );
      if (approved + rejected > 0) console.log(`✅ Onboarding backfill: ${approved} approved, ${rejected} rejected`);
    } catch (error) {
      console.error('❌ Onboarding backfill failed:', error.message);
    }

    // One-time backfill for agent activation: agents approved before the contract / E-Certificate
    // step existed (no decision timestamp) were already working, so keep them active.
    // New approvals always set onboardingDecidedAt, so they are not touched.
    try {
      const [activated] = await User.update(
        { isActivated: true, activatedAt: new Date() },
        { where: { role: 'agent', onboardingStatus: 'approved', onboardingDecidedAt: null, isActivated: false } }
      );
      if (activated > 0) console.log(`✅ Activation backfill: ${activated} existing agent(s) set active`);
    } catch (error) {
      console.error('❌ Activation backfill failed:', error.message);
    }

    // One-time carry-over for the visa pipeline: applications that were already invoice-eligible or
    // invoiced under the old rules are treated as complete (Visa 100%, fees accepted) so they keep working.
    // New applications start at "Application" and are never eligible there, so this is safe to repeat.
    try {
      const { Op } = require('sequelize');
      const [carried] = await Application.update(
        { pipelineStage: 'Visa100', feeStatus: 'Accepted', pipelineUpdatedAt: new Date() },
        { where: { pipelineStage: 'Application', [Op.or]: [{ isInvoiceEligible: true }, { isInvoiced: true }] } }
      );
      if (carried > 0) console.log(`✅ Visa pipeline backfill: ${carried} existing application(s) set to Visa 100% / fees accepted`);
    } catch (error) {
      console.error('❌ Visa pipeline backfill failed:', error.message);
    }

    // Campus visits, offers, admission and enrollment were removed. An application left in one of those
    // statuses moves back to Under Review, so none is stuck without a way forward. Its visa stage
    // (pipelineStage) is untouched: the Head of Admission sets it on the application page.
    try {
      const { Op } = require('sequelize');
      const [moved] = await Application.update(
        { status: 'UnderReview' },
        { where: { status: { [Op.in]: ['VisitScheduled', 'VisitCompleted', 'OfferReceived', 'ConditionalOffer', 'AdmissionConfirmed', 'Enrolled'] } } }
      );
      if (moved > 0) console.log(`✅ Status cleanup: ${moved} application(s) moved from a removed status to Under Review`);
    } catch (error) {
      console.error('❌ Status cleanup failed:', error.message);
    }

    // Initialize object storage
    try {
      await initStorage();
    } catch (error) {
      console.error('❌ Failed to initialize object storage');
      console.log('⚠️ Continuing with local storage fallback');
    }

    // Seed database
    await seedDatabase();

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}/api`);
      console.log(`🔗 Frontend URL: ${frontendUrl}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
