import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [onLoginCallback, setOnLoginCallback] = useState(null);
  const [onLogoutCallback, setOnLogoutCallback] = useState(null);

  // Register callbacks for data operations
  const registerCallbacks = useCallback((onLogin, onLogout) => {
    setOnLoginCallback(() => onLogin);
    setOnLogoutCallback(() => onLogout);
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.me();
        setUser(response.data);
        // Trigger data load on successful auth check
        if (onLoginCallback) {
          onLoginCallback();
        }
      } catch (error) {
        setUser(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [onLoginCallback]);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      setUser(response.data);
      // Trigger data refresh after login
      if (onLoginCallback) {
        await onLoginCallback();
      }
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
      // Clear data on logout
      if (onLogoutCallback) {
        onLogoutCallback();
      }
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
    isAuthenticated: !!user && user !== false,
    registerCallbacks
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
