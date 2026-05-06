import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS, getStoredData, setStoredData } from '../utils/storage';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const theme = 'light';
  const resolvedTheme = 'light';

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
  }, []);

  const setThemeValue = () => {
    // No-op
  };

  const toggleTheme = () => {
    // No-op
  };

  const value = {
    theme,
    resolvedTheme,
    setTheme: setThemeValue,
    toggleTheme,
    isDark: false
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
