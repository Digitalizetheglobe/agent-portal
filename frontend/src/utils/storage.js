// LocalStorage utility functions

// LocalStorage keys
export const STORAGE_KEYS = {
  AUTH: 'admin_portal_auth',
  AGENTS: 'admin_portal_agents',
  EVENTS: 'admin_portal_events',
  STUDENTS: 'admin_portal_students',
  THEME: 'admin_portal_theme'
};

// Helper functions for localStorage
export const getStoredData = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setStoredData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Generate unique ID
export const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
