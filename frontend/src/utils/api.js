import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Format API error for display
export const formatApiError = (error) => {
  const detail = error.response?.data?.detail;
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
};

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, new_password: newPassword })
};

// Agent APIs
export const agentAPI = {
  getAll: () => api.get('/agents'),
  getById: (id) => api.get(`/agents/${id}`),
  create: (data) => api.post('/agents', data),
  update: (id, data) => api.put(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`)
};

// Event APIs
export const eventAPI = {
  getAll: () => api.get('/events'),
  getById: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`)
};

// Student APIs
export const studentAPI = {
  getAll: (params = {}) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  uploadDocument: (studentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/students/${studentId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  downloadDocument: (studentId, docId) => api.get(`/students/${studentId}/documents/${docId}`, {
    responseType: 'blob'
  })
};

// Stats API
export const statsAPI = {
  get: () => api.get('/stats')
};

export default api;
