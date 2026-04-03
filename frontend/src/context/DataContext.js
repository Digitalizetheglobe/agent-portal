import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true);

  // Fetch all data
  const fetchAgents = useCallback(async () => {
    try {
      const response = await agentAPI.getAll();
      setAgents(response.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await eventAPI.getAll();
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, []);

  const fetchStudents = useCallback(async (filters = {}) => {
    try {
      const response = await studentAPI.getAll(filters);
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await statsAPI.get();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAgents(), fetchEvents(), fetchStudents(), fetchStats()]);
    setLoading(false);
  }, [fetchAgents, fetchEvents, fetchStudents, fetchStats]);

  // Initialize data on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

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

  // Upload document
  const uploadStudentDocument = async (studentId, file) => {
    try {
      const response = await studentAPI.uploadDocument(studentId, file);
      // Refresh students to get updated document list
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
    refreshData,
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
