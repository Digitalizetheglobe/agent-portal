import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  INITIAL_ADMIN, 
  INITIAL_AGENTS, 
  STORAGE_KEYS, 
  getStoredData, 
  setStoredData 
} from '../utils/mockData';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedAuth = getStoredData(STORAGE_KEYS.AUTH, null);
    if (storedAuth) {
      setUser(storedAuth);
    }
    setLoading(false);
  }, []);

  const login = (userId, password) => {
    // Check admin credentials
    if (userId === INITIAL_ADMIN.userId && password === INITIAL_ADMIN.password) {
      const userData = {
        id: INITIAL_ADMIN.id,
        userId: INITIAL_ADMIN.userId,
        name: INITIAL_ADMIN.name,
        role: 'admin',
        avatar: INITIAL_ADMIN.avatar
      };
      setUser(userData);
      setStoredData(STORAGE_KEYS.AUTH, userData);
      return { success: true, role: 'admin' };
    }

    // Check agent credentials
    const agents = getStoredData(STORAGE_KEYS.AGENTS, INITIAL_AGENTS);
    const agent = agents.find(a => a.userId === userId && a.password === password);
    
    if (agent) {
      if (agent.status === 'inactive') {
        return { success: false, error: 'Your account is inactive. Please contact admin.' };
      }
      const userData = {
        id: agent.id,
        userId: agent.userId,
        name: agent.name,
        role: 'agent',
        avatar: agent.avatar
      };
      setUser(userData);
      setStoredData(STORAGE_KEYS.AUTH, userData);
      return { success: true, role: 'agent' };
    }

    return { success: false, error: 'Invalid credentials' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  };

  const isAdmin = () => user?.role === 'admin';
  const isAgent = () => user?.role === 'agent';

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
    isAgent,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
