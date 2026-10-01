require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB, sequelize } = require('./config/db');
const { initStorage } = require('./utils/storage');

// Import models to ensure associations are registered
const { User, Event, Student, University, Course } = require('./models');

// Import routes
const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const eventRoutes = require('./routes/eventRoutes');
const studentRoutes = require('./routes/studentRoutes');
const statsRoutes = require('./routes/statsRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const universityRoutes = require('./routes/universityRoutes');
const invoiceReviewRoutes = require('./routes/invoiceReviewRoutes');
const courseRoutes = require('./routes/courseRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check routes (before /api prefix)
app.get('/api', (req, res) => {
  res.json({ message: 'Admin Portal API', status: 'healthy', database: 'postgresql' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: 'postgresql', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/invoice-reviews', invoiceReviewRoutes);
app.use('/api/courses', courseRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      detail: 'File too large. Maximum size is 10MB.'
    });
  }
  
  if (err.message === 'Invalid file type') {
    return res.status(400).json({
      success: false,
      detail: 'Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG, GIF, TXT, CSV'
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    detail: err.message || 'Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({
    success: false,
    detail: 'Route not found'
  });
});

// Database seeding function
const seedDatabase = async () => {
  console.log('🌱 Starting database seeding...');

  try {
    // Check and create admin
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    let admin = await User.findOne({ where: { email: adminEmail } });
    
    if (!admin) {
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
    } else {
      console.log(`ℹ️ Admin already exists: ${adminEmail}`);
    }

    // Check if we need to seed sample data
    const agentCount = await User.count({ where: { role: 'agent' } });
    
    if (agentCount === 0) {
      console.log('📝 Seeding sample data...');

      // Create sample agents
      const agentsData = [
        { name: 'John Smith', email: 'john.smith@example.com', userId: 'john.smith', password: 'agent123', phone: '+1 234 567 8901', status: 'active', isVerified: true, verificationStatus: 'approved' },
        { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', userId: 'sarah.johnson', password: 'agent123', phone: '+1 234 567 8902', status: 'active', isVerified: true, verificationStatus: 'approved' },
        { name: 'Mike Davis', email: 'mike.davis@example.com', userId: 'mike.davis', password: 'agent123', phone: '+1 234 567 8903', status: 'inactive', isVerified: false, verificationStatus: 'pending' }
      ];

      const agents = [];
      for (const agentData of agentsData) {
        const agent = await User.create({ ...agentData, role: 'agent' });
        agents.push(agent);
      }
      console.log(`✅ Created ${agents.length} sample agents`);

      // Create sample events
      const eventsData = [
        { title: 'Tech Career Fair 2025', description: 'Annual technology career fair featuring top tech companies and startups. Students can explore opportunities in software development, data science, and more.', date: '2025-03-15', assignedAgents: [agents[0].id, agents[1].id] },
        { title: 'MBA Open Day', description: 'Explore MBA programs from leading business schools. Learn about admission requirements, curriculum, and career prospects.', date: '2025-04-20', assignedAgents: [agents[1].id] },
        { title: 'Study Abroad Workshop', description: 'Comprehensive workshop covering study abroad options, visa processes, and scholarship opportunities.', date: '2025-05-10', assignedAgents: [agents[0].id, agents[2].id] }
      ];

      const events = [];
      for (const eventData of eventsData) {
        const event = await Event.create({ ...eventData, createdBy: admin.id });
        events.push(event);
      }
      console.log(`✅ Created ${events.length} sample events`);

      // Create sample students
      const studentsData = [
        { name: 'Alice Wang', email: 'alice.wang@email.com', phone: '+86 123 4567 8901', country: 'China', education: "Bachelor's in Computer Science", courseInterested: "Master's in Data Science", notes: 'Interested in AI/ML programs', eventId: events[0].id, agentId: agents[0].id },
        { name: 'Raj Patel', email: 'raj.patel@email.com', phone: '+91 987 654 3210', country: 'India', education: "Bachelor's in Engineering", courseInterested: 'MBA', notes: 'Looking for scholarships', eventId: events[1].id, agentId: agents[1].id },
        { name: 'Emma Thompson', email: 'emma.t@email.com', phone: '+44 789 012 3456', country: 'United Kingdom', education: 'A-Levels', courseInterested: "Bachelor's in Business", notes: 'Prefers universities in USA', eventId: events[2].id, agentId: agents[0].id }
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

    // Write test credentials
    const fs = require('fs');
    const path = require('path');
    const memoryDir = path.join(__dirname, '..', 'memory');
    
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }

    const credentials = `# Test Credentials

## Admin Account
- Email: ${adminEmail}
- Password: ${adminPassword}
- Role: admin

## Agent Accounts
- john.smith@example.com / agent123 (Active)
- sarah.johnson@example.com / agent123 (Active)
- mike.davis@example.com / agent123 (Inactive)

## Database
- Engine: PostgreSQL
- Database: ${process.env.DB_NAME || 'agent_portal'}
- Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}
`;

    fs.writeFileSync(path.join(memoryDir, 'test_credentials.md'), credentials);
    console.log('✅ Test credentials written to memory/test_credentials.md');

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
    console.log('🔄 Synchronizing PostgreSQL database schema...');
    await sequelize.sync({ alter: true });
    console.log('✅ PostgreSQL schema synchronized successfully');

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
