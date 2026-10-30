import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  agentAPI,
  newsAPI,
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
  const [news, setNews] = useState([]);
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
  const userRole = user?.role;
  const userRef = useRef(user);
  userRef.current = user;

  // Fetch all data
  const fetchAgents = useCallback(async () => {
    if (userRole !== 'admin') {
      const selfAgent = userRef.current ? [userRef.current] : [];
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
  }, [userRole]);

  const fetchNews = useCallback(async () => {
    try {
      const response = await newsAPI.getAll();
      setNews(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching news:', error);
      setNews([]);
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
        totalStudents: 15,
        convertedStudents: 3,
        conversionRate: 20.0,
        registrationTrend: [
          { month: 'Nov 2023', count: 2 },
          { month: 'Dec 2023', count: 4 },
          { month: 'Jan 2024', count: 3 },
          { month: 'Feb 2024', count: 5 },
          { month: 'Mar 2024', count: 8 },
          { month: 'Apr 2024', count: 6 }
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
      // The API nests agent/invoice under those keys; the UI reads populated agentId/invoiceId
      const normalized = data.map(p => ({
        ...p,
        agentId: p.agent || p.agentId,
        invoiceId: p.invoice || p.invoiceId
      }));
      setPayoffs(normalized);
      return normalized;
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
        fetchNews(), 
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
  }, [fetchAgents, fetchNews, fetchStudents, fetchStats, fetchInvoices, fetchPayoffs, fetchTickets, fetchNotifications, fetchUniversities, fetchCourses, fetchApplications]);

  // Clear all data - called on logout
  const clearData = useCallback(() => {
    setAgents([]);
    setNews([]);
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

  const reviewAgentOnboarding = async (id, action, data) => {
    try {
      const response = await agentAPI.reviewOnboarding(id, action, data);
      setAgents(prev => prev.map(agent => agent.id === id ? { ...agent, ...response.data } : agent));
      return response.data;
    } catch (error) {
      toast.error('Review action failed', { description: formatApiError(error) });
      throw error;
    }
  };

  const uploadVerificationDocument = async (file, docType, replaces) => {
    try {
      const response = await agentAPI.uploadVerificationDocument(file, docType, replaces);
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

  // Runs a contract / E-Certificate action and merges the updated agent into state
  const runAgentContractAction = async (id, request, failMessage) => {
    try {
      const response = await request();
      setAgents(prev => prev.map(agent => agent.id === id ? { ...agent, ...response.data } : agent));
      return response.data;
    } catch (error) {
      toast.error(failMessage, { description: formatApiError(error) });
      throw error;
    }
  };

  const issueAgentContract = (id, file, expiresAt) =>
    runAgentContractAction(id, () => agentAPI.issueContract(id, file, expiresAt), 'Failed to issue contract');

  const uploadSignedAgentContract = (id, file) =>
    runAgentContractAction(id, () => agentAPI.uploadSignedContract(id, file), 'Failed to upload signed contract');

  const issueAgentCertificate = (id, file) =>
    runAgentContractAction(id, () => agentAPI.issueCertificate(id, file), 'Failed to issue E-Certificate');

  const updateAgentUniversityAccess = (id, data) =>
    runAgentContractAction(id, () => agentAPI.updateUniversityAccess(id, data), 'Failed to save university access');

  const viewAgentDocument = async (agentId, docId, download = agentAPI.downloadDocument) => {
    try {
      toast.loading('Opening document...');
      const response = await download(agentId, docId, { inline: true });
      
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

  const viewPayoffSlip = (payoffId) =>
    viewAgentDocument(payoffId, null, (id, _doc, params) => payoffAPI.downloadSlip(id, params));

  const viewAgentContractFile = (agentId, docId) =>
    viewAgentDocument(agentId, docId, agentAPI.downloadContractFile);

  // News & updates operations
  const createNews = async (newsData) => {
    try {
      const response = await newsAPI.create(newsData);
      setNews(prev => [response.data, ...prev]);
      await fetchNews();
      return response.data;
    } catch (error) {
      toast.error('Failed to publish', { description: formatApiError(error) });
      throw error;
    }
  };

  const updateNews = async (id, newsData) => {
    try {
      const response = await newsAPI.update(id, newsData);
      setNews(prev => prev.map(item => item.id === id ? { ...item, ...response.data } : item));
      await fetchNews();
      return response.data;
    } catch (error) {
      toast.error('Failed to update', { description: formatApiError(error) });
      throw error;
    }
  };

  const deleteNews = async (id) => {
    try {
      await newsAPI.delete(id);
      setNews(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      toast.error('Failed to delete', { description: formatApiError(error) });
      throw error;
    }
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

  const getStudentsByAgent = useCallback((agentId) => {
    if (!agentId) return [];
    return students.filter(student => {
      const sAgentId = student.agentId?.id || student.agentId?._id || student.agentId || student.agent?.id;
      return String(sAgentId) === String(agentId);
    });
  }, [students]);

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
  const uploadStudentDocument = async (studentId, file, category, name) => {
    try {
      const response = await studentAPI.uploadDocument(studentId, file, category, name);
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

  const requestStudentDocument = async (studentId, category, label) => {
    try {
      const response = await studentAPI.requestDocument(studentId, category, label);
      const documentRequests = response.data?.documentRequests || [];
      setStudents(prev => prev.map(s => (s.id === studentId || s._id === studentId) ? { ...s, documentRequests } : s));
      toast.success('Request sent to agent');
      return documentRequests;
    } catch (error) {
      toast.error('Failed to send request', { description: formatApiError(error) });
      return null;
    }
  };

  // Statistics
  const getStats = () => stats || {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalStudents: students.length,
    // Students whose fees are confirmed (Visa 100% and fees accepted)
    convertedStudents: students.filter(s => s.feesPaid).length,
    conversionRate: students.length > 0 ? ((students.filter(s => s.feesPaid).length / students.length) * 100).toFixed(1) : 0,
    registrationTrend: [],
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
  const settlePayoff = async (id, data, slip) => {
    try {
      const response = await payoffAPI.settle(id, data, slip);
      await Promise.all([fetchPayoffs(), fetchInvoices()]);
      toast.success('Payoff settlement confirmed');
      return response.data;
    } catch (error) {
      toast.error('Failed to settle payoff', { description: formatApiError(error) });
      throw error;
    }
  };

  // Head of Admission: allow the agent to be paid before the university has paid (needs a note)
  const authorizePaymentException = async (id, data) => {
    try {
      const response = await payoffAPI.authorizeBypass(id, data);
      await fetchPayoffs();
      toast.success('Exception authorized');
      return response.data;
    } catch (error) {
      toast.error('Failed to authorize the exception', { description: formatApiError(error) });
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

  const replacePayoff = async (id, data) => {
    try {
      const response = await payoffAPI.replace(id, data);
      await Promise.all([fetchPayoffs(), fetchInvoices()]);
      toast.success('Replacement payoff created');
      return response.data;
    } catch (error) {
      toast.error('Failed to create replacement payoff', { description: formatApiError(error) });
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

  // Rebuilt only when data changes, so unrelated parent renders don't re-render every consumer.
  // Handlers close over this state, so every state value is a dependency.
  /* eslint-disable react-hooks/exhaustive-deps */
  const value = useMemo(() => ({
    agents,
    news,
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
    reviewAgentOnboarding,
    uploadVerificationDocument,
    deleteVerificationDocument,
    viewAgentDocument,
    viewAgentContractFile,
    viewPayoffSlip,
    authorizePaymentException,
    issueAgentContract,
    uploadSignedAgentContract,
    issueAgentCertificate,
    updateAgentUniversityAccess,
    // News & updates operations
    fetchNews,
    createNews,
    updateNews,
    deleteNews,
    // Student operations
    fetchAgents,
    fetchStudents,
    addStudent,
    getStudentsByAgent,
    deleteStudent,
    updateStudent,
    getStudentById,
    uploadStudentDocument,
    verifyStudentDocument,
    viewStudentDocument,
    requestStudentDocument,
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
    replacePayoff,
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
  }), [agents, news, students, stats, invoices, payoffs, tickets, notifications, universities, courses, applications, reviewQueue, verificationQueue, loading, initialized, user, userRole, fetchAgents, fetchNews, fetchStudents, fetchStats, fetchInvoices, fetchPayoffs, fetchTickets, fetchNotifications, fetchUniversities, fetchCourses, fetchApplications, fetchReviewQueue, fetchVerificationQueue, refreshData, clearData]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
