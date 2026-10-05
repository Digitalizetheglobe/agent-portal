import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  agentAPI,
  eventAPI,
  studentAPI,
  statsAPI,
  invoiceAPI,
  ticketAPI,
  notificationAPI,
  universityAPI,
  applicationAPI,
  admissionTrackingAPI,
  invoiceReviewAPI,
  studentVerificationAPI,
  courseAPI,
  payoffAPI,
  formatApiError
} from '../utils/api';
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
  const [payoffs, setPayoffs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Fetch all data
  const fetchAgents = useCallback(async () => {
    if (user?.role !== 'admin') {
      const selfAgent = user ? [user] : [];
      setAgents(selfAgent);
      return selfAgent;
    }
    try {
      const response = await agentAPI.getAll();
      setAgents(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
      return [];
    }
  }, [user]);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await eventAPI.getAll();
      setEvents(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
      return [];
    }
  }, []);

  const fetchStudents = useCallback(async (filters = {}) => {
    try {
      // Backend paginates (default 20, max 100 per request), so load every page
      const limit = 100;
      const first = await studentAPI.getAll({ ...filters, page: 1, limit, envelope: 'true' });
      let all = first.data?.students || [];
      const totalPages = first.data?.totalPages || 1;
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            studentAPI.getAll({ ...filters, page: i + 2, limit, envelope: 'true' })
          )
        );
        rest.forEach(r => { all = all.concat(r.data?.students || []); });
      }
      setStudents(all);
      return all;
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
      return [];
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

  const fetchPayoffs = useCallback(async (params = {}) => {
    try {
      const response = await payoffAPI.getAll(params);
      const data = Array.isArray(response.data) ? response.data : (response.data?.payoffs || []);
      setPayoffs(data);
      return data;
    } catch (error) {
      console.error('Error fetching payoffs:', error);
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

  const fetchUniversities = useCallback(async (params = {}) => {
    try {
      const response = await universityAPI.getAll(params);
      const data = Array.isArray(response.data) ? response.data : (response.data?.universities || []);
      setUniversities(data);
      return data;
    } catch (error) {
      console.error('Error fetching universities:', error);
      return [];
    }
  }, []);

  const fetchCourses = useCallback(async (params = {}) => {
    try {
      const response = await courseAPI.getAll(params);
      const data = Array.isArray(response.data) ? response.data : (response.data?.courses || []);
      setCourses(data);
      return data;
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }, []);

  const fetchApplications = useCallback(async (params = {}) => {
    try {
      const response = await applicationAPI.getAll(params);
      const data = Array.isArray(response.data) ? response.data : (response.data?.applications || []);
      setApplications(data);
      return data;
    } catch (error) {
      console.error('Error fetching applications:', error);
      return [];
    }
  }, []);

  const fetchReviewQueue = useCallback(async (params = {}) => {
    try {
      const response = await invoiceReviewAPI.getAll(params);
      const data = Array.isArray(response.data) ? response.data : (response.data?.reviews || []);
      setReviewQueue(data);
      return data;
    } catch (error) {
      console.error('Error fetching review queue:', error);
      return [];
    }
  }, []);

  const fetchVerificationQueue = useCallback(async (params = {}) => {
    try {
      const response = await studentVerificationAPI.getQueue(params);
      const data = Array.isArray(response.data) ? response.data : (response.data?.students || []);
      setVerificationQueue(data);
      return data;
    } catch (error) {
      console.error('Error fetching verification queue:', error);
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
        fetchPayoffs(),
        fetchTickets(),
        fetchNotifications(),
        fetchUniversities(),
        fetchCourses(),
        fetchApplications()
      ]);
      setInitialized(true);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAgents, fetchEvents, fetchStudents, fetchStats, fetchInvoices, fetchPayoffs, fetchTickets, fetchNotifications, fetchUniversities, fetchCourses, fetchApplications]);

  // Clear all data - called on logout
  const clearData = useCallback(() => {
    setAgents([]);
    setEvents([]);
    setStudents([]);
    setStats(null);
    setInvoices([]);
    setPayoffs([]);
    setTickets([]);
    setNotifications([]);
    setUniversities([]);
    setCourses([]);
    setApplications([]);
    setReviewQueue([]);
    setVerificationQueue([]);
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

  const deleteVerificationDocument = async (docId) => {
    try {
      const response = await agentAPI.deleteVerificationDocument(docId);
      // Return updated user data
      return response.data;
    } catch (error) {
      toast.error('Failed to delete document', { description: formatApiError(error) });
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

  const notifyAgents = async (id, message) => {
    try {
      await eventAPI.notifyAgents(id, message);
      toast.success('Notification broadcast sent to all assigned agents');
    } catch (error) {
      toast.error('Failed to send notifications', { description: formatApiError(error) });
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
      // Refresh all students data from server
      await fetchStudents();
      try {
        await fetchStats();
      } catch (_) {}
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
    if (!agentId) return [];
    return students.filter(student => {
      const sAgentId = student.agentId?.id || student.agentId?._id || student.agentId || student.agent?.id;
      return String(sAgentId) === String(agentId);
    });
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

  const deleteInvoice = async (id) => {
    try {
      await invoiceAPI.delete(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      toast.error('Failed to delete invoice', { description: formatApiError(error) });
      throw error;
    }
  };

  // Payoff operations (FA-2 & FA-3)
  const settlePayoff = async (id, data) => {
    try {
      const response = await payoffAPI.settle(id, data);
      await Promise.all([fetchPayoffs(), fetchInvoices()]);
      toast.success('Payoff settlement confirmed');
      return response.data;
    } catch (error) {
      toast.error('Failed to settle payoff', { description: formatApiError(error) });
      throw error;
    }
  };

  const cancelPayoff = async (id, data) => {
    try {
      const response = await payoffAPI.cancel(id, data);
      await Promise.all([fetchPayoffs(), fetchInvoices()]);
      toast.success('Payoff cancelled');
      return response.data;
    } catch (error) {
      toast.error('Failed to cancel payoff', { description: formatApiError(error) });
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

  const deleteTicket = async (id) => {
    try {
      await ticketAPI.delete(id);
      setTickets(prev => prev.filter(t => t.id !== id));
      toast.success('Ticket deleted successfully');
    } catch (error) {
      toast.error('Failed to delete ticket', { description: formatApiError(error) });
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

  // University operations (Phase C)
  const createUniversity = async (data) => {
    try {
      const response = await universityAPI.create(data);
      setUniversities(prev => [...prev, response.data]);
      toast.success('University created successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to create university', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateUniversity = async (id, data) => {
    try {
      const response = await universityAPI.update(id, data);
      setUniversities(prev => prev.map(u => u.id === id ? response.data : u));
      toast.success('University updated successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to update university', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateUniversityStatus = async (id, status) => {
    try {
      const response = await universityAPI.updateStatus(id, status);
      setUniversities(prev => prev.map(u => u.id === id ? response.data : u));
      toast.success('University status updated');
      return response.data;
    } catch (error) {
      toast.error('Failed to update university status', { description: formatApiError(error) });
      throw error;
    }
  };

  const deleteUniversity = async (id) => {
    try {
      await universityAPI.delete(id);
      setUniversities(prev => prev.filter(u => u.id !== id));
      toast.success('University deleted successfully');
    } catch (error) {
      toast.error('Failed to delete university', { description: formatApiError(error) });
      throw error;
    }
  };

  // Course operations
  const createCourse = async (data) => {
    try {
      const response = await courseAPI.create(data);
      const created = response.data?.course || response.data;
      setCourses(prev => [created, ...prev]);
      toast.success('Course created successfully');
      return created;
    } catch (error) {
      toast.error('Failed to create course', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateCourse = async (id, data) => {
    try {
      const response = await courseAPI.update(id, data);
      const updated = response.data?.course || response.data;
      setCourses(prev => prev.map(c => (c.id === id || c._id === id) ? updated : c));
      toast.success('Course updated successfully');
      return updated;
    } catch (error) {
      toast.error('Failed to update course', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateCourseStatus = async (id, status) => {
    try {
      const response = await courseAPI.updateStatus(id, status);
      const updated = response.data?.course || response.data;
      setCourses(prev => prev.map(c => (c.id === id || c._id === id) ? updated : c));
      toast.success(`Course ${status === 'active' ? 'activated' : 'deactivated'}`);
      return updated;
    } catch (error) {
      toast.error('Failed to update course status', { description: formatApiError(error) });
      throw error;
    }
  };

  const deleteCourse = async (id) => {
    try {
      await courseAPI.delete(id);
      setCourses(prev => prev.filter(c => c.id !== id && c._id !== id));
      toast.success('Course deleted successfully');
    } catch (error) {
      toast.error('Failed to delete course', { description: formatApiError(error) });
      throw error;
    }
  };

  // Application operations (Phase B & D)
  const createApplication = async (data) => {
    try {
      const response = await applicationAPI.create(data);
      setApplications(prev => [response.data, ...prev]);
      toast.success('Application created successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to create application', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateApplication = async (id, data) => {
    try {
      const response = await applicationAPI.update(id, data);
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      toast.success('Application updated successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to update application', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateApplicationStatus = async (id, status, remarks) => {
    try {
      const response = await applicationAPI.updateStatus(id, status, remarks);
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      toast.success('Application status updated');
      return response.data;
    } catch (error) {
      toast.error('Failed to update application status', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateWorkflowStatus = async (id, status, notes) => {
    try {
      const response = await applicationAPI.updateWorkflowStatus(id, status, notes);
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      return response.data;
    } catch (error) {
      toast.error('Failed to update workflow status', { description: formatApiError(error) });
      throw error;
    }
  };

  const deleteApplication = async (id) => {
    try {
      await applicationAPI.delete(id);
      setApplications(prev => prev.filter(app => app.id !== id));
      toast.success('Application deleted successfully');
    } catch (error) {
      toast.error('Failed to delete application', { description: formatApiError(error) });
      throw error;
    }
  };

  // Admission Tracking operations (Phase E)
  const scheduleVisit = async (id, data) => {
    try {
      const response = await admissionTrackingAPI.scheduleVisit(id, data);
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      toast.success('Campus visit scheduled successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to schedule visit', { description: formatApiError(error) });
      throw error;
    }
  };

  const completeVisit = async (id, data) => {
    try {
      const response = await admissionTrackingAPI.completeVisit(id, data);
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      toast.success('Campus visit marked as completed');
      return response.data;
    } catch (error) {
      toast.error('Failed to complete visit', { description: formatApiError(error) });
      throw error;
    }
  };

  const recordOffer = async (id, data) => {
    try {
      const response = await admissionTrackingAPI.createOffer(id, data);
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      toast.success('University offer recorded successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to record offer', { description: formatApiError(error) });
      throw error;
    }
  };

  const recordConditionalOffer = async (id, data) => {
    try {
      const response = await admissionTrackingAPI.createConditionalOffer(id, data);
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      toast.success('Conditional offer recorded successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to record conditional offer', { description: formatApiError(error) });
      throw error;
    }
  };

  const confirmAdmission = async (id, data) => {
    try {
      const response = await admissionTrackingAPI.confirmAdmission(id, data);
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      toast.success('Student admission confirmed successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to confirm admission', { description: formatApiError(error) });
      throw error;
    }
  };

  const recordEnrollment = async (id, data) => {
    try {
      const response = await admissionTrackingAPI.enroll(id, data);
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      toast.success('Student enrollment recorded successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to record enrollment', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateDeposit = async (id, data) => {
    try {
      const response = await admissionTrackingAPI.updateDeposit(id, data);
      setApplications(prev => prev.map(app => app.id === id ? response.data : app));
      toast.success('Deposit information updated successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to update deposit', { description: formatApiError(error) });
      throw error;
    }
  };

  // Finance Review operations (Phase G)
  const startInvoiceReview = async (invoiceId) => {
    try {
      const response = await invoiceReviewAPI.start(invoiceId);
      setReviewQueue(prev => prev.map(r => r.id === invoiceId ? response.data : r));
      setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, ...response.data } : i));
      toast.success('Invoice review started');
      return response.data;
    } catch (error) {
      toast.error('Failed to start review', { description: formatApiError(error) });
      throw error;
    }
  };

  const approveInvoiceReview = async (invoiceId, data) => {
    try {
      const response = await invoiceReviewAPI.approve(invoiceId, data);
      setReviewQueue(prev => prev.map(r => r.id === invoiceId ? response.data : r));
      setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, ...response.data } : i));
      toast.success('Invoice approved');
      return response.data;
    } catch (error) {
      toast.error('Failed to approve invoice', { description: formatApiError(error) });
      throw error;
    }
  };

  const rejectInvoiceReview = async (invoiceId, data) => {
    try {
      const response = await invoiceReviewAPI.reject(invoiceId, data);
      setReviewQueue(prev => prev.map(r => r.id === invoiceId ? response.data : r));
      setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, ...response.data } : i));
      toast.success('Invoice review rejected');
      return response.data;
    } catch (error) {
      toast.error('Failed to reject invoice', { description: formatApiError(error) });
      throw error;
    }
  };

  // Student Verification operations (Phase H)
  const initiateStudentVerification = async (studentId, data) => {
    try {
      const response = await studentVerificationAPI.initiate(studentId, data);
      setVerificationQueue(prev => prev.map(s => s.id === studentId ? { ...s, ...response.data } : s));
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...response.data } : s));
      toast.success('Student verification initiated');
      return response.data;
    } catch (error) {
      toast.error('Failed to initiate verification', { description: formatApiError(error) });
      throw error;
    }
  };

  const verifyStudent = async (studentId, data) => {
    try {
      const response = await studentVerificationAPI.verify(studentId, data);
      setVerificationQueue(prev => prev.map(s => s.id === studentId ? { ...s, ...response.data } : s));
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...response.data } : s));
      toast.success('Student verified successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to verify student', { description: formatApiError(error) });
      throw error;
    }
  };

  const rejectStudent = async (studentId, data) => {
    try {
      const response = await studentVerificationAPI.reject(studentId, data);
      setVerificationQueue(prev => prev.map(s => s.id === studentId ? { ...s, ...response.data } : s));
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...response.data } : s));
      toast.success('Student verification rejected');
      return response.data;
    } catch (error) {
      toast.error('Failed to reject verification', { description: formatApiError(error) });
      throw error;
    }
  };

  const value = {
    agents,
    events,
    students,
    invoices,
    tickets,
    notifications,
    universities,
    applications,
    reviewQueue,
    verificationQueue,
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
    deleteVerificationDocument,
    viewAgentDocument,
    // Event operations
    createEvent,
    updateEvent,
    deleteEvent,
    notifyAgents,
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
    // University operations
    universities,
    fetchUniversities,
    createUniversity,
    updateUniversity,
    updateUniversityStatus,
    deleteUniversity,
    // Course operations
    courses,
    fetchCourses,
    createCourse,
    updateCourse,
    updateCourseStatus,
    deleteCourse,
    // Application operations
    fetchApplications,
    createApplication,
    updateApplication,
    updateApplicationStatus,
    updateWorkflowStatus,
    deleteApplication,
    // Admission tracking operations
    scheduleVisit,
    completeVisit,
    recordOffer,
    recordConditionalOffer,
    confirmAdmission,
    recordEnrollment,
    updateDeposit,
    // Invoice operations
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    fetchInvoices,
    // Payoff operations (FA-2 & FA-3)
    payoffs,
    fetchPayoffs,
    settlePayoff,
    cancelPayoff,
    // Finance review operations
    fetchReviewQueue,
    startInvoiceReview,
    approveInvoiceReview,
    rejectInvoiceReview,
    // Student verification operations
    fetchVerificationQueue,
    initiateStudentVerification,
    verifyStudent,
    rejectStudent,
    // Ticket operations
    createTicket,
    addTicketResponse,
    updateTicketStatus,
    deleteTicket,
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
