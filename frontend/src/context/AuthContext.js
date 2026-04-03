import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, formatApiError } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = checking, false = not authenticated
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.me();
        setUser(response.data);
      } catch (error) {
        setUser(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      setUser(response.data);
      return { success: true, role: response.data.role };
    } catch (error) {
      return { success: false, error: formatApiError(error) };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(false);
    }
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
    isAuthenticated: !!user && user !== false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
