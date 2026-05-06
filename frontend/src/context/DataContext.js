import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { agentAPI, eventAPI, studentAPI, statsAPI, invoiceAPI, ticketAPI, notificationAPI, formatApiError } from '../utils/api';
import { toast } from 'sonner';

const DataContext = createContext(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch all data
  const fetchAgents = useCallback(async () => {
    try {
      const response = await agentAPI.getAll();
      setAgents(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching agents:', error);
      // Fallback to mock data when backend is unavailable
      const mockAgents = [
        { id: 1, name: 'John Smith', email: 'john.smith@example.com', status: 'active', role: 'agent' },
        { id: 2, name: 'Jane Doe', email: 'jane.doe@example.com', status: 'active', role: 'agent' },
        { id: 3, name: 'Bob Wilson', email: 'bob.wilson@example.com', status: 'inactive', role: 'agent' }
      ];
      setAgents(mockAgents);
      return mockAgents;
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await eventAPI.getAll();
      setEvents(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      // Fallback to mock data when backend is unavailable
      const mockEvents = [
        { 
          id: 1, 
          title: 'Tech Conference 2024', 
          date: '2024-03-15', 
          assignedAgents: [1, 2], 
          createdAt: '2024-01-10T10:00:00Z',
          location: 'Convention Center',
          description: 'Annual technology conference'
        },
        { 
          id: 2, 
          title: 'Career Fair', 
          date: '2024-04-20', 
          assignedAgents: [1], 
          createdAt: '2024-01-15T14:30:00Z',
          location: 'University Campus',
          description: 'Student career fair event'
        },
        { 
          id: 3, 
          title: 'Workshop Series', 
          date: '2024-05-10', 
          assignedAgents: [2, 3], 
          createdAt: '2024-02-01T09:15:00Z',
          location: 'Training Center',
          description: 'Professional development workshops'
        }
      ];
      setEvents(mockEvents);
      return mockEvents;
    }
  }, []);

  const fetchStudents = useCallback(async (filters = {}) => {
    try {
      const response = await studentAPI.getAll(filters);
      setStudents(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching students:', error);
      // Fallback to mock data when backend is unavailable
      const mockStudents = [
        { 
          id: 1, 
          name: 'Alice Johnson', 
          email: 'alice.j@student.edu',
          eventId: 1, 
          agentId: 1, 
          submittedAt: '2024-01-20T10:30:00Z',
          phone: '555-0101',
          status: 'registered'
        },
        { 
          id: 2, 
          name: 'Bob Smith', 
          email: 'bob.s@student.edu',
          eventId: 1, 
          agentId: 2, 
          submittedAt: '2024-01-21T14:15:00Z',
          phone: '555-0102',
          status: 'registered'
        },
        { 
          id: 3, 
          name: 'Carol Williams', 
          email: 'carol.w@student.edu',
          eventId: 2, 
          agentId: 1, 
          submittedAt: '2024-01-22T09:45:00Z',
          phone: '555-0103',
          status: 'registered'
        },
        { 
          id: 4, 
          name: 'David Brown', 
          email: 'david.b@student.edu',
          eventId: 3, 
          agentId: 2, 
          submittedAt: '2024-01-23T16:20:00Z',
          phone: '555-0104',
          status: 'registered'
        },
        { 
          id: 5, 
          name: 'Eva Davis', 
          email: 'eva.d@student.edu',
          eventId: 2, 
          agentId: 1, 
          submittedAt: '2024-01-24T11:10:00Z',
          phone: '555-0105',
          status: 'registered'
        }
      ];
      setStudents(mockStudents);
      return mockStudents;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await statsAPI.get();
      setStats(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback to mock data when backend is unavailable
      const mockStats = {
        totalAgents: 3,
        activeAgents: 2,
        totalEvents: 3,
        upcomingEvents: 2,
        totalStudents: 15,
        convertedStudents: 3,
        conversionRate: 20.0,
        statusBreakdown: [
          { status: 'Registered', count: 5 },
          { status: 'Contacted', count: 3 },
          { status: 'Confirmed', count: 2 },
          { status: 'Attended', count: 2 },
          { status: 'Converted', count: 3 }
        ],
        registrationTrend: [
          { month: 'Nov 2023', count: 2 },
          { month: 'Dec 2023', count: 4 },
          { month: 'Jan 2024', count: 3 },
          { month: 'Feb 2024', count: 5 },
          { month: 'Mar 2024', count: 8 },
          { month: 'Apr 2024', count: 6 }
        ],
        eventBreakdown: [
          { title: 'Tech Conference', count: 12 },
          { title: 'Career Fair', count: 8 },
          { title: 'Workshop', count: 5 }
        ],
        agentBreakdown: [
          { name: 'John Smith', count: 15 },
          { name: 'Jane Doe', count: 12 },
          { name: 'Bob Wilson', count: 8 }
        ]
      };
      setStats(mockStats);
      return mockStats;
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await invoiceAPI.getAll();
      setInvoices(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const response = await ticketAPI.getAll();
      setTickets(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationAPI.getAll();
      setNotifications(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }, []);

  // Initialize/refresh all data - called after login
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAgents(), 
        fetchEvents(), 
        fetchStudents(), 
        fetchStats(), 
        fetchInvoices(), 
        fetchTickets(),
        fetchNotifications()
      ]);
      setInitialized(true);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAgents, fetchEvents, fetchStudents, fetchStats, fetchInvoices, fetchTickets]);

  // Clear all data - called on logout
  const clearData = useCallback(() => {
    setAgents([]);
    setEvents([]);
    setStudents([]);
    setStats(null);
    setInvoices([]);
    setTickets([]);
    setNotifications([]);
    setInitialized(false);
  }, []);

  // Automatically refresh data when authenticated, clear when not
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    } else {
      clearData();
    }
  }, [isAuthenticated, refreshData, clearData]);

  // Agent CRUD operations
  const createAgent = async (agentData) => {
    try {
      const response = await agentAPI.create(agentData);
      setAgents(prev => [...prev, response.data]);
      await fetchStats();
      return response.data;
    } catch (error) {
      toast.error('Failed to create agent', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateAgent = async (id, agentData) => {
    try {
      const response = await agentAPI.update(id, agentData);
      setAgents(prev => prev.map(agent => agent.id === id ? response.data : agent));
      return response.data;
    } catch (error) {
      toast.error('Failed to update agent', { description: formatApiError(error) });
      throw error;
    }
  };

  const deleteAgent = async (id) => {
    try {
      await agentAPI.delete(id);
      setAgents(prev => prev.filter(agent => agent.id !== id));
      await fetchStats();
    } catch (error) {
      toast.error('Failed to delete agent', { description: formatApiError(error) });
      throw error;
    }
  };

  const getAgentById = (id) => agents.find(agent => agent.id === id);

  const verifyAgent = async (id, data) => {
    try {
      const response = await agentAPI.verify(id, data);
      setAgents(prev => prev.map(agent => agent.id === id ? response.data : agent));
      return response.data;
    } catch (error) {
      toast.error('Failed to verify agent', { description: formatApiError(error) });
      throw error;
    }
  };

  const uploadVerificationDocument = async (file, docType) => {
    try {
      const response = await agentAPI.uploadVerificationDocument(file, docType);
      // Return updated user data
      return response.data;
    } catch (error) {
      toast.error('Failed to upload document', { description: formatApiError(error) });
      throw error;
    }
  };

  const viewAgentDocument = async (agentId, docId) => {
    try {
      toast.loading('Opening document...');
      const response = await agentAPI.downloadDocument(agentId, docId, { inline: true });
      
      // If response is not a blob (e.g. error JSON), it will still be in response.data as a blob
      // We check the content type to be sure
      const contentType = response.headers['content-type'];
      
      if (contentType.includes('application/json')) {
        // Error returned as JSON but caught as Blob
        const text = await response.data.text();
        const error = JSON.parse(text);
        throw new Error(error.detail || 'Failed to load document');
      }

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        toast.dismiss();
        toast.error('Pop-up blocked. Please allow pop-ups to view documents.');
      } else {
        toast.dismiss();
        toast.success('Document opened');
      }
    } catch (error) {
      console.error('Error viewing agent document:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to view document');
    }
  };

  // Event CRUD operations
  const createEvent = async (eventData) => {
    try {
      const response = await eventAPI.create(eventData);
      setEvents(prev => [...prev, response.data]);
      await fetchStats();
      return response.data;
    } catch (error) {
      toast.error('Failed to create event', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateEvent = async (id, eventData) => {
    try {
      const response = await eventAPI.update(id, eventData);
      setEvents(prev => prev.map(event => event.id === id ? response.data : event));
      return response.data;
    } catch (error) {
      toast.error('Failed to update event', { description: formatApiError(error) });
      throw error;
    }
  };

  const deleteEvent = async (id) => {
    try {
      await eventAPI.delete(id);
      setEvents(prev => prev.filter(event => event.id !== id));
      setStudents(prev => prev.filter(student => student.eventId !== id));
      await fetchStats();
    } catch (error) {
      toast.error('Failed to delete event', { description: formatApiError(error) });
      throw error;
    }
  };

  const getEventById = (id) => events.find(event => event.id === id);

  const getEventsForAgent = (agentId) => {
    return events.filter(event => event.assignedAgents?.includes(agentId));
  };

  // Student operations
  const addStudent = async (studentData) => {
    try {
      const response = await studentAPI.create(studentData);
      // Refresh students data from server to get latest state (including students added by other agents)
      await fetchStudents({ eventId: studentData.eventId });
      await fetchStats();
      return response.data;
    } catch (error) {
      toast.error('Failed to register student', { description: formatApiError(error) });
      throw error;
    }
  };

  const getStudentsByEvent = (eventId) => {
    return students.filter(student => student.eventId === eventId);
  };

  // Refresh students for specific event
  const fetchStudentsForEvent = async (eventId) => {
    try {
      const response = await studentAPI.getAll({ eventId });
      setStudents(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching students for event:', error);
      return [];
    }
  };

  const getStudentsByAgent = (agentId) => {
    return students.filter(student => student.agentId === agentId);
  };

  const deleteStudent = async (id) => {
    try {
      await studentAPI.delete(id);
      setStudents(prev => prev.filter(student => student.id !== id));
      try {
        await fetchStats();
      } catch (statsError) {
        console.error('Error fetching stats after deletion:', statsError);
        // Don't throw error for stats failure - it's not critical
      }
    } catch (error) {
      toast.error('Failed to delete student', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateStudent = useCallback(async (id, studentData) => {
    try {
      const response = await studentAPI.update(id, studentData);
      setStudents(prev => prev.map(student => student.id === id ? response.data : student));
      return response.data;
    } catch (error) {
      toast.error('Failed to update student', { description: formatApiError(error) });
      throw error;
    }
  }, []);

  const updateStudentStatus = useCallback(async (id, status) => {
    try {
      const response = await studentAPI.updateStatus(id, status);
      setStudents(prev => prev.map(student => student.id === id ? response.data : student));
      return response.data;
    } catch (error) {
      toast.error('Failed to update student status', { description: formatApiError(error) });
      throw error;
    }
  }, []);

  const getStudentById = useCallback(async (id) => {
    try {
      const response = await studentAPI.getById(id);
      return response.data;
    } catch (error) {
      console.error('Error fetching student:', error);
      throw error;
    }
  }, []);

  // Upload document
  const uploadStudentDocument = async (studentId, file, category) => {
    try {
      const response = await studentAPI.uploadDocument(studentId, file, category);
      await fetchStudents();
      return response.data;
    } catch (error) {
      toast.error('Failed to upload document', { description: formatApiError(error) });
      throw error;
    }
  };

  const verifyStudentDocument = async (studentId, docId, data) => {
    try {
      const response = await studentAPI.verifyDocument(studentId, docId, data);
      setStudents(prev => prev.map(student => student.id === studentId ? response.data : student));
      return response.data;
    } catch (error) {
      toast.error('Failed to verify document', { description: formatApiError(error) });
      throw error;
    }
  };

  const viewStudentDocument = async (studentId, docId) => {
    try {
      toast.loading('Opening document...');
      const response = await studentAPI.downloadDocument(studentId, docId);
      const contentType = response.headers['content-type'];
      
      if (contentType.includes('application/json')) {
        const text = await response.data.text();
        const error = JSON.parse(text);
        throw new Error(error.detail || 'Failed to load document');
      }

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        toast.dismiss();
        toast.error('Pop-up blocked. Please allow pop-ups to view documents.');
      } else {
        toast.dismiss();
        toast.success('Document opened');
      }
    } catch (error) {
      console.error('Error viewing student document:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to view document');
    }
  };

  const requestStudentDocument = async (studentId, category) => {
    try {
      await studentAPI.requestDocument(studentId, category);
      toast.success('Request sent to agent');
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  // Statistics
  const getStats = () => stats || {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalEvents: events.length,
    upcomingEvents: events.filter(e => new Date(e.date) >= new Date()).length,
    totalStudents: students.length,
    convertedStudents: students.filter(s => s.status === 'Converted').length,
    conversionRate: students.length > 0 ? ((students.filter(s => s.status === 'Converted').length / students.length) * 100).toFixed(1) : 0,
    statusBreakdown: [],
    registrationTrend: [],
    eventBreakdown: [],
    agentBreakdown: []
  };

  // Invoice operations
  const createInvoice = async (data) => {
    try {
      const response = await invoiceAPI.create(data);
      setInvoices(prev => [response.data, ...prev]);
      toast.success('Invoice raised successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to raise invoice', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateInvoiceStatus = async (id, data) => {
    try {
      const response = await invoiceAPI.updateStatus(id, data);
      setInvoices(prev => prev.map(inv => inv.id === id ? response.data : inv));
      toast.success(`Invoice marked as ${data.status}`);
      return response.data;
    } catch (error) {
      toast.error('Failed to update invoice status', { description: formatApiError(error) });
      throw error;
    }
  };

  // Ticket operations
  const createTicket = async (data) => {
    try {
      const response = await ticketAPI.create(data);
      setTickets(prev => [response.data, ...prev]);
      toast.success('Ticket created successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to create ticket', { description: formatApiError(error) });
      throw error;
    }
  };

  const addTicketResponse = async (id, message) => {
    try {
      const response = await ticketAPI.addResponse(id, message);
      setTickets(prev => prev.map(t => t.id === id ? response.data : t));
      return response.data;
    } catch (error) {
      toast.error('Failed to send response', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateTicketStatus = async (id, status) => {
    try {
      const response = await ticketAPI.updateStatus(id, status);
      setTickets(prev => prev.map(t => t.id === id ? response.data : t));
      toast.success(`Ticket status updated to ${status}`);
      return response.data;
    } catch (error) {
      toast.error('Failed to update ticket status', { description: formatApiError(error) });
      throw error;
    }
  };

  // Notification operations
  const markNotificationAsRead = async (id) => {
    try {
      const response = await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? response.data : n));
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const value = {
    agents,
    events,
    students,
    invoices,
    tickets,
    notifications,
    loading,
    initialized,
    refreshData,
    clearData,
    // Agent operations
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentById,
    verifyAgent,
    uploadVerificationDocument,
    viewAgentDocument,
    // Event operations
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    getEventsForAgent,
    // Student operations
    fetchStudents,
    addStudent,
    getStudentsByEvent,
    getStudentsByAgent,
    deleteStudent,
    updateStudent,
    updateStudentStatus,
    getStudentById,
    uploadStudentDocument,
    verifyStudentDocument,
    viewStudentDocument,
    requestStudentDocument,
    fetchStudentsForEvent,
    // Invoice operations
    createInvoice,
    updateInvoiceStatus,
    fetchInvoices,
    // Ticket operations
    createTicket,
    addTicketResponse,
    updateTicketStatus,
    fetchTickets,
    // Notification operations
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    // Statistics
    getStats
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
