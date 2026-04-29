import React, { createContext, useContext, useState, useCallback } from 'react';
import { agentAPI, eventAPI, studentAPI, statsAPI, formatApiError } from '../utils/api';
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
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

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
        totalStudents: 5
      };
      setStats(mockStats);
      return mockStats;
    }
  }, []);

  // Initialize/refresh all data - called after login
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAgents(), fetchEvents(), fetchStudents(), fetchStats()]);
      setInitialized(true);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAgents, fetchEvents, fetchStudents, fetchStats]);

  // Clear all data - called on logout
  const clearData = useCallback(() => {
    setAgents([]);
    setEvents([]);
    setStudents([]);
    setStats(null);
    setInitialized(false);
  }, []);

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

  const updateStudent = async (id, studentData) => {
    try {
      const response = await studentAPI.update(id, studentData);
      setStudents(prev => prev.map(student => student.id === id ? response.data : student));
      return response.data;
    } catch (error) {
      toast.error('Failed to update student', { description: formatApiError(error) });
      throw error;
    }
  };

  const getStudentById = async (id) => {
    try {
      const response = await studentAPI.getById(id);
      return response.data;
    } catch (error) {
      console.error('Error fetching student:', error);
      throw error;
    }
  };

  // Upload document
  const uploadStudentDocument = async (studentId, file) => {
    try {
      const response = await studentAPI.uploadDocument(studentId, file);
      await fetchStudents();
      return response.data;
    } catch (error) {
      toast.error('Failed to upload document', { description: formatApiError(error) });
      throw error;
    }
  };

  // Statistics
  const getStats = () => stats || {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalEvents: events.length,
    upcomingEvents: events.filter(e => new Date(e.date) >= new Date()).length,
    totalStudents: students.length
  };

  const value = {
    agents,
    events,
    students,
    loading,
    initialized,
    refreshData,
    clearData,
    // Agent operations
    createAgent,
    updateAgent,
    deleteAgent,
    getAgentById,
    // Event operations
    createEvent,
    updateEvent,
    deleteEvent,
    getEventById,
    getEventsForAgent,
    // Student operations
    addStudent,
    getStudentsByEvent,
    getStudentsByAgent,
    deleteStudent,
    updateStudent,
    getStudentById,
    uploadStudentDocument,
    fetchStudentsForEvent,
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
