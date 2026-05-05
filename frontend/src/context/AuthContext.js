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

  const login = async (email, password, role) => {
    try {
      const response = await authAPI.login(email, password, role);
      setUser(response.data);
      // Trigger data refresh in background - don't await so navigation is instant
      if (onLoginCallback) {
        onLoginCallback();
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

  const updateProfile = async (data) => {
    try {
      const response = await authAPI.updateProfile(data);
      setUser(response.data);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: formatApiError(error) };
    }
  };

  const updatePassword = async (current_password, new_password) => {
    try {
      await authAPI.updatePassword(current_password, new_password);
      return { success: true };
    } catch (error) {
      return { success: false, error: formatApiError(error) };
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isAgent = () => user?.role === 'agent';

  const updateUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
    isAgent,
    updateUser,
    updateProfile,
    updatePassword,
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
