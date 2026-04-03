// Initial mock data for the application
export const INITIAL_ADMIN = {
  id: 'admin-001',
  userId: 'admin',
  password: 'admin123',
  name: 'Super Admin',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1762522926157-bcc04bf0b10a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc3NTIwOTY3NXww&ixlib=rb-4.1.0&q=85&w=100'
};

export const INITIAL_AGENTS = [
  {
    id: 'agent-001',
    name: 'John Smith',
    email: 'john.smith@example.com',
    userId: 'john.smith',
    password: 'agent123',
    phone: '+1 234 567 8901',
    status: 'active',
    role: 'agent',
    avatar: 'https://images.pexels.com/photos/30004324/pexels-photo-30004324.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=100&w=100'
  },
  {
    id: 'agent-002',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    userId: 'sarah.johnson',
    password: 'agent123',
    phone: '+1 234 567 8902',
    status: 'active',
    role: 'agent',
    avatar: null
  },
  {
    id: 'agent-003',
    name: 'Mike Davis',
    email: 'mike.davis@example.com',
    userId: 'mike.davis',
    password: 'agent123',
    phone: '+1 234 567 8903',
    status: 'inactive',
    role: 'agent',
    avatar: null
  }
];

export const INITIAL_EVENTS = [
  {
    id: 'event-001',
    title: 'Tech Career Fair 2025',
    description: 'Annual technology career fair featuring top tech companies and startups. Students can explore opportunities in software development, data science, and more.',
    date: '2025-03-15',
    assignedAgents: ['agent-001', 'agent-002'],
    createdAt: '2025-01-10'
  },
  {
    id: 'event-002',
    title: 'MBA Open Day',
    description: 'Explore MBA programs from leading business schools. Learn about admission requirements, curriculum, and career prospects.',
    date: '2025-04-20',
    assignedAgents: ['agent-002'],
    createdAt: '2025-01-12'
  },
  {
    id: 'event-003',
    title: 'Study Abroad Workshop',
    description: 'Comprehensive workshop covering study abroad options, visa processes, and scholarship opportunities.',
    date: '2025-05-10',
    assignedAgents: ['agent-001', 'agent-003'],
    createdAt: '2025-01-15'
  }
];

export const INITIAL_STUDENTS = [
  {
    id: 'student-001',
    name: 'Alice Wang',
    email: 'alice.wang@email.com',
    phone: '+86 123 4567 8901',
    country: 'China',
    education: 'Bachelor\'s in Computer Science',
    courseInterested: 'Master\'s in Data Science',
    notes: 'Interested in AI/ML programs',
    eventId: 'event-001',
    agentId: 'agent-001',
    submittedAt: '2025-01-20'
  },
  {
    id: 'student-002',
    name: 'Raj Patel',
    email: 'raj.patel@email.com',
    phone: '+91 987 654 3210',
    country: 'India',
    education: 'Bachelor\'s in Engineering',
    courseInterested: 'MBA',
    notes: 'Looking for scholarships',
    eventId: 'event-002',
    agentId: 'agent-002',
    submittedAt: '2025-01-21'
  },
  {
    id: 'student-003',
    name: 'Emma Thompson',
    email: 'emma.t@email.com',
    phone: '+44 789 012 3456',
    country: 'United Kingdom',
    education: 'A-Levels',
    courseInterested: 'Bachelor\'s in Business',
    notes: 'Prefers universities in USA',
    eventId: 'event-003',
    agentId: 'agent-001',
    submittedAt: '2025-01-22'
  }
];

// LocalStorage keys
export const STORAGE_KEYS = {
  AUTH: 'admin_portal_auth',
  AGENTS: 'admin_portal_agents',
  EVENTS: 'admin_portal_events',
  STUDENTS: 'admin_portal_students',
  THEME: 'admin_portal_theme'
};

// Helper functions for localStorage
export const getStoredData = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setStoredData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Generate unique ID
export const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
