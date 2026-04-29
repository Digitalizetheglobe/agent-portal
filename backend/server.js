require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { initStorage } = require('./utils/storage');

// Import routes
const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const eventRoutes = require('./routes/eventRoutes');
const studentRoutes = require('./routes/studentRoutes');
const statsRoutes = require('./routes/statsRoutes');

// Import models for seeding
const User = require('./models/User');
const Event = require('./models/Event');
const Student = require('./models/Student');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: [frontendUrl, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check routes (before /api prefix)
app.get('/api', (req, res) => {
  res.json({ message: 'Admin Portal API', status: 'healthy' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/stats', statsRoutes);

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
  console.log('Headers:', req.headers);
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

    let admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      admin = await User.create({
        name: 'Super Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        status: 'active'
      });
      console.log(`✅ Admin created: ${adminEmail}`);
    } else {
      console.log(`ℹ️ Admin already exists: ${adminEmail}`);
    }

    // Check if we need to seed sample data
    const agentCount = await User.countDocuments({ role: 'agent' });
    
    if (agentCount === 0) {
      console.log('📝 Seeding sample data...');

      // Create sample agents
      const agentsData = [
        { name: 'John Smith', email: 'john.smith@example.com', userId: 'john.smith', password: 'agent123', phone: '+1 234 567 8901', status: 'active' },
        { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', userId: 'sarah.johnson', password: 'agent123', phone: '+1 234 567 8902', status: 'active' },
        { name: 'Mike Davis', email: 'mike.davis@example.com', userId: 'mike.davis', password: 'agent123', phone: '+1 234 567 8903', status: 'inactive' }
      ];

      const agents = [];
      for (const agentData of agentsData) {
        const agent = await User.create({ ...agentData, role: 'agent' });
        agents.push(agent);
      }
      console.log(`✅ Created ${agents.length} sample agents`);

      // Create sample events
      const eventsData = [
        { title: 'Tech Career Fair 2025', description: 'Annual technology career fair featuring top tech companies and startups. Students can explore opportunities in software development, data science, and more.', date: '2025-03-15', assignedAgents: [agents[0]._id, agents[1]._id] },
        { title: 'MBA Open Day', description: 'Explore MBA programs from leading business schools. Learn about admission requirements, curriculum, and career prospects.', date: '2025-04-20', assignedAgents: [agents[1]._id] },
        { title: 'Study Abroad Workshop', description: 'Comprehensive workshop covering study abroad options, visa processes, and scholarship opportunities.', date: '2025-05-10', assignedAgents: [agents[0]._id, agents[2]._id] }
      ];

      const events = [];
      for (const eventData of eventsData) {
        const event = await Event.create({ ...eventData, createdBy: admin._id });
        events.push(event);
      }
      console.log(`✅ Created ${events.length} sample events`);

      // Create sample students
      const studentsData = [
        { name: 'Alice Wang', email: 'alice.wang@email.com', phone: '+86 123 4567 8901', country: 'China', education: "Bachelor's in Computer Science", courseInterested: "Master's in Data Science", notes: 'Interested in AI/ML programs', eventId: events[0]._id, agentId: agents[0]._id },
        { name: 'Raj Patel', email: 'raj.patel@email.com', phone: '+91 987 654 3210', country: 'India', education: "Bachelor's in Engineering", courseInterested: 'MBA', notes: 'Looking for scholarships', eventId: events[1]._id, agentId: agents[1]._id },
        { name: 'Emma Thompson', email: 'emma.t@email.com', phone: '+44 789 012 3456', country: 'United Kingdom', education: 'A-Levels', courseInterested: "Bachelor's in Business", notes: 'Prefers universities in USA', eventId: events[2]._id, agentId: agents[0]._id }
      ];

      for (const studentData of studentsData) {
        await Student.create(studentData);
      }
      console.log(`✅ Created ${studentsData.length} sample students`);
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

## API Endpoints
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- GET /api/agents
- GET /api/events
- GET /api/students
- GET /api/stats
`;

    fs.writeFileSync(path.join(memoryDir, 'test_credentials.md'), credentials);
    console.log('✅ Test credentials written to /app/memory/test_credentials.md');

    console.log('🌱 Database seeding completed!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
};

// Start server
const PORT = process.env.PORT || 8001;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize object storage
    try {
      await initStorage();
    } catch (error) {
      console.error('❌ Failed to initialize object storage: Request failed with status code 500');
      console.log('⚠️ Continuing without object storage - file uploads will be disabled');
    }

    // Seed database
    await seedDatabase();

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API URL: http://0.0.0.0:${PORT}/api`);
      console.log(`🔗 Frontend URL: ${frontendUrl}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
