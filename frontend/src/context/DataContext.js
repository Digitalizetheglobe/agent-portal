import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  INITIAL_AGENTS, 
  INITIAL_EVENTS, 
  INITIAL_STUDENTS,
  STORAGE_KEYS, 
  getStoredData, 
  setStoredData,
  generateId 
} from '../utils/mockData';

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
  const [loading, setLoading] = useState(true);

  // Initialize data from localStorage or defaults
  useEffect(() => {
    const storedAgents = getStoredData(STORAGE_KEYS.AGENTS, INITIAL_AGENTS);
    const storedEvents = getStoredData(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    const storedStudents = getStoredData(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    
    setAgents(storedAgents);
    setEvents(storedEvents);
    setStudents(storedStudents);
    setLoading(false);
  }, []);

  // Persist agents to localStorage
  useEffect(() => {
    if (!loading) {
      setStoredData(STORAGE_KEYS.AGENTS, agents);
    }
  }, [agents, loading]);

  // Persist events to localStorage
  useEffect(() => {
    if (!loading) {
      setStoredData(STORAGE_KEYS.EVENTS, events);
    }
  }, [events, loading]);

  // Persist students to localStorage
  useEffect(() => {
    if (!loading) {
      setStoredData(STORAGE_KEYS.STUDENTS, students);
    }
  }, [students, loading]);

  // Agent CRUD operations
  const createAgent = (agentData) => {
    const newAgent = {
      ...agentData,
      id: generateId('agent'),
      role: 'agent',
      avatar: null
    };
    setAgents(prev => [...prev, newAgent]);
    return newAgent;
  };

  const updateAgent = (id, agentData) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id ? { ...agent, ...agentData } : agent
    ));
  };

  const deleteAgent = (id) => {
    setAgents(prev => prev.filter(agent => agent.id !== id));
    // Also remove agent from events
    setEvents(prev => prev.map(event => ({
      ...event,
      assignedAgents: event.assignedAgents.filter(agentId => agentId !== id)
    })));
  };

  const getAgentById = (id) => agents.find(agent => agent.id === id);

  // Event CRUD operations
  const createEvent = (eventData) => {
    const newEvent = {
      ...eventData,
      id: generateId('event'),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  };

  const updateEvent = (id, eventData) => {
    setEvents(prev => prev.map(event => 
      event.id === id ? { ...event, ...eventData } : event
    ));
  };

  const deleteEvent = (id) => {
    setEvents(prev => prev.filter(event => event.id !== id));
    // Also remove students linked to this event
    setStudents(prev => prev.filter(student => student.eventId !== id));
  };

  const getEventById = (id) => events.find(event => event.id === id);

  const getEventsForAgent = (agentId) => {
    return events.filter(event => event.assignedAgents.includes(agentId));
  };

  // Student operations
  const addStudent = (studentData) => {
    const newStudent = {
      ...studentData,
      id: generateId('student'),
      submittedAt: new Date().toISOString().split('T')[0]
    };
    setStudents(prev => [...prev, newStudent]);
    return newStudent;
  };

  const getStudentsByEvent = (eventId) => {
    return students.filter(student => student.eventId === eventId);
  };

  const getStudentsByAgent = (agentId) => {
    return students.filter(student => student.agentId === agentId);
  };

  // Statistics
  const getStats = () => ({
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalEvents: events.length,
    upcomingEvents: events.filter(e => new Date(e.date) >= new Date()).length,
    totalStudents: students.length
  });

  const value = {
    agents,
    events,
    students,
    loading,
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
