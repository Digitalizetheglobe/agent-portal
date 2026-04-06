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
      return [];
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await eventAPI.getAll();
      setEvents(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }, []);

  const fetchStudents = useCallback(async (filters = {}) => {
    try {
      const response = await studentAPI.getAll(filters);
      setStudents(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching students:', error);
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
      return null;
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
      setStudents(prev => [...prev, response.data]);
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

  const getStudentsByAgent = (agentId) => {
    return students.filter(student => student.agentId === agentId);
  };

  const deleteStudent = async (id) => {
    try {
      await studentAPI.delete(id);
      setStudents(prev => prev.filter(student => student.id !== id));
      await fetchStats();
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
