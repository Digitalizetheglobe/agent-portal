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

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Auth endpoints must never trigger a refresh: a wrong password on /auth/login
    // (or a failed /auth/refresh itself) would otherwise queue behind its own refresh and hang
    const isAuthRequest = /\/auth\/(login|refresh)/.test(originalRequest?.url || '');

    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      const isPublicRoute = /^\/(login|register)/.test(window.location.pathname);
      const refreshToken = localStorage.getItem('refresh_token');

      // If on a public route and there is no refresh token (e.g. unauthenticated visitor on /register/:token),
      // do not attempt refresh or redirect to login.
      if (!refreshToken) {
        localStorage.removeItem('access_token');
        if (!isPublicRoute) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, add this request to the queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        const response = await api.post('/auth/refresh', { refreshToken });
        
        const { accessToken } = response.data;
        if (accessToken) {
          localStorage.setItem('access_token', accessToken);
        }
        
        // Process the queue with the new token
        processQueue(null, accessToken);
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, process queue with error
        processQueue(refreshError);
        
        // Clear tokens on failure
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        // If refresh fails, only redirect to login if not already on a public route
        if (!isPublicRoute) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

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
  login: async (email, password, role) => {
    const response = await api.post('/auth/login', { email, password, role });
    if (response.data.accessToken) {
      localStorage.setItem('access_token', response.data.accessToken);
    }
    if (response.data.refreshToken) {
      localStorage.setItem('refresh_token', response.data.refreshToken);
    }
    return response;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
  me: () => api.get('/auth/me'),
  refresh: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await api.post('/auth/refresh', { refreshToken });
    if (response.data.accessToken) {
      localStorage.setItem('access_token', response.data.accessToken);
    }
    return response;
  },
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, new_password: newPassword }),
  updateProfile: (data) => api.put('/auth/update-profile', data),
  // Changing the password ends every older session; the server answers with a fresh pair for this one
  updatePassword: async (current_password, new_password) => {
    const response = await api.put('/auth/update-password', { current_password, new_password });
    if (response.data.accessToken) {
      localStorage.setItem('access_token', response.data.accessToken);
    }
    if (response.data.refreshToken) {
      localStorage.setItem('refresh_token', response.data.refreshToken);
    }
    return response;
  }
};

// Onboarding APIs (invite links)
export const onboardingAPI = {
  createInvite: (data) => api.post('/onboarding/invites', data),
  getInvites: () => api.get('/onboarding/invites'),
  revokeInvite: (id) => api.patch(`/onboarding/invites/${id}/revoke`),
  getInvite: (token) => api.get(`/onboarding/${token}`),
  register: async (token, data) => {
    const response = await api.post(`/onboarding/${token}/register`, data);
    if (response.data.accessToken) {
      localStorage.setItem('access_token', response.data.accessToken);
    }
    if (response.data.refreshToken) {
      localStorage.setItem('refresh_token', response.data.refreshToken);
    }
    return response;
  }
};

// Agent APIs
export const agentAPI = {
  getAll: () => api.get('/agents'),
  getAccountManagers: () => api.get('/agents/account-managers'),
  getMe: () => api.get('/agents/me'),
  submitOnboarding: () => api.post('/agents/me/onboarding/submit'),
  acceptDeclaration: (data) => api.post('/agents/me/declaration', data),
  reviewOnboarding: (id, action, data = {}) => api.patch(`/agents/${id}/onboarding/${action}`, data),
  getById: (id) => api.get(`/agents/${id}`),
  updateUniversityAccess: (id, data) => api.put(`/agents/${id}/university-access`, data),
  create: (data) => api.post('/agents', data),
  createAdmin: (data) => api.post('/agents/admin', data),
  update: (id, data) => api.put(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`),
  uploadVerificationDocument: (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    return api.post('/agents/me/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteVerificationDocument: (docId) => api.delete(`/agents/me/documents/${docId}`),
  verify: (id, data) => api.patch(`/agents/${id}/verify`, data),
  downloadDocument: (agentId, docId, params = {}) => api.get(`/agents/${agentId}/documents/${docId}`, {
    params,
    responseType: 'blob'
  }),
  // Contract + E-Certificate (after approval)
  issueContract: (id, file, expiresAt) => {
    const formData = new FormData();
    formData.append('file', file);
    if (expiresAt) formData.append('expiresAt', expiresAt);
    return api.post(`/agents/${id}/contract/issue`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadOwnSignedContract: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/agents/me/contract/signed', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadSignedContract: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/agents/${id}/contract/signed`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  issueCertificate: (id, file) => {
    const formData = new FormData();
    if (file) formData.append('file', file);
    return api.post(`/agents/${id}/certificate`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // docId is a contract document id, or 'certificate' for the E-Certificate file
  downloadContractFile: (agentId, docId, params = {}) => api.get(`/agents/${agentId}/contract/${docId}`, {
    params,
    responseType: 'blob'
  })
};

// News & Updates APIs
export const newsAPI = {
  getAll: (params = {}) => api.get('/news', { params }),
  getById: (id) => api.get(`/news/${id}`),
  uploadMedia: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/news/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return `${BACKEND_URL}${res.data.path}`;
  },
  create: (data) => api.post('/news', data),
  update: (id, data) => api.put(`/news/${id}`, data),
  delete: (id) => api.delete(`/news/${id}`)
};

export const studentAPI = {
  getAll: (params = {}) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => {
    return api.put(`/students/${id}`, data);
  },
  delete: (id) => api.delete(`/students/${id}`),
  uploadDocument: (studentId, file, category) => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    return api.post(`/students/${studentId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  verifyDocument: (studentId, docId, data) => api.patch(`/students/${studentId}/documents/${docId}/verify`, data),
  requestDocument: (studentId, category, label) => api.post(`/students/${studentId}/documents/request`, { category, label }),
  downloadDocument: (studentId, docId, params = {}) => api.get(`/students/${studentId}/documents/${docId}`, {
    params,
    responseType: 'blob'
  }),
  getApplications: (studentId) => api.get(`/students/${studentId}/applications`)
};

// Stats API
export const statsAPI = {
  get: () => api.get('/stats')
};

// University APIs (Phase C)
export const universityAPI = {
  getAll: (params = {}) => api.get('/universities', { params }),
  getById: (id) => api.get(`/universities/${id}`),
  getApplications: (id) => api.get(`/universities/${id}/applications`),
  // Fees, brochures and news / scholarship updates (published by the Head of Admission, read by everyone)
  getCourses: (id) => api.get(`/universities/${id}/courses`),
  uploadBrochure: (id, file, title) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    return api.post(`/universities/${id}/brochures`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteBrochure: (id, brochureId) => api.delete(`/universities/${id}/brochures/${brochureId}`),
  downloadBrochure: (id, brochureId, params = {}) => api.get(`/universities/${id}/brochures/${brochureId}`, { params, responseType: 'blob' }),
  getUpdates: (id) => api.get(`/universities/${id}/updates`),
  createUpdate: (id, data) => api.post(`/universities/${id}/updates`, data),
  editUpdate: (id, updateId, data) => api.put(`/universities/${id}/updates/${updateId}`, data),
  deleteUpdate: (id, updateId) => api.delete(`/universities/${id}/updates/${updateId}`),
  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/universities/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return `${BACKEND_URL}${res.data.path}`;
  },
  create: (data) => api.post('/universities', data),
  update: (id, data) => api.put(`/universities/${id}`, data),
  updateStatus: (id, status) => {
    const payload = typeof status === 'object' ? status : { status };
    return api.patch(`/universities/${id}/status`, payload);
  },
  delete: (id) => api.delete(`/universities/${id}`)
};

// Course APIs
export const courseAPI = {
  getAll: (params = {}) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  updateStatus: (id, status) => {
    const payload = typeof status === 'object' ? status : { status };
    return api.patch(`/courses/${id}/status`, payload);
  },
  delete: (id) => api.delete(`/courses/${id}`)
};

// Application APIs (Phase B & D)
export const applicationAPI = {
  getAll: (params = {}) => api.get('/applications', { params }),
  getById: (id) => api.get(`/applications/${id}`),
  create: (data) => api.post('/applications', data),
  update: (id, data) => api.put(`/applications/${id}`, data),
  updateStatus: (id, status, remarks) => {
    const payload = typeof status === 'object' ? status : { status, remarks };
    return api.patch(`/applications/${id}/status`, payload);
  },
  updateWorkflowStatus: (id, status, notes) => {
    const payload = typeof status === 'object' ? status : { status, notes };
    return api.patch(`/applications/${id}/workflow/status`, payload);
  },
  delete: (id) => api.delete(`/applications/${id}`),
  getByStudent: (studentId) => api.get(`/applications/student/${studentId}`),
  getByUniversity: (universityId) => api.get(`/applications/university/${universityId}`),
  getByAgent: (agentId) => api.get(`/applications/agent/${agentId}`),
  getHistory: (id, params = {}) => api.get(`/applications/${id}/history`, { params }),
  // Visa pipeline (Head of Admission moves stages and reviews the proof; the agent uploads it)
  updatePipeline: (id, data) => api.patch(`/applications/${id}/pipeline`, data),
  submitFeeProof: (id, file, note) => {
    const formData = new FormData();
    formData.append('file', file);
    if (note) formData.append('note', note);
    return api.post(`/applications/${id}/fee-proof`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  reviewFeeProof: (id, data) => api.patch(`/applications/${id}/fee-proof/review`, data),
  downloadFeeProof: (id, params = {}) => api.get(`/applications/${id}/fee-proof/file`, { params, responseType: 'blob' }),
  submitArrivalTicket: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/applications/${id}/arrival-ticket`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  downloadArrivalTicket: (id, params = {}) => api.get(`/applications/${id}/arrival-ticket/file`, { params, responseType: 'blob' })
};

// Application review status and history (submit, start review, reject, withdraw)
export const admissionTrackingAPI = {
  updateWorkflowStatus: (id, data) => api.patch(`/applications/${id}/workflow/status`, data),
  getHistory: (id, params = {}) => api.get(`/applications/${id}/history`, { params })
};

// Invoice APIs (Phase F)
export const invoiceAPI = {
  getAll: (params = {}) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  updateStatus: (id, data) => api.patch(`/invoices/${id}/status`, data),
  getEligibleApplications: (params = {}) => api.get('/invoices/eligible-applications', { params }),
  delete: (id) => api.delete(`/invoices/${id}`)
};

// Invoice Review APIs (Phase G & FA-2/FA-3)
export const invoiceReviewAPI = {
  getAll: (params = {}) => api.get('/invoice-reviews', { params }),
  getByInvoiceId: (invoiceId) => api.get(`/invoice-reviews/${invoiceId}`),
  start: (invoiceId) => api.patch(`/invoice-reviews/${invoiceId}/start`),
  approve: (invoiceId, data = {}) => api.patch(`/invoice-reviews/${invoiceId}/approve`, data),
  reject: (invoiceId, data = {}) => api.patch(`/invoice-reviews/${invoiceId}/reject`, data),
  correction: (invoiceId, data = {}) => api.patch(`/invoice-reviews/${invoiceId}/correction`, data),
  resubmit: (invoiceId, data = {}) => api.patch(`/invoice-reviews/${invoiceId}/resubmit`, data),
  getHistory: (invoiceId) => api.get(`/invoice-reviews/${invoiceId}/history`)
};

// Payoff APIs (FA-2 & FA-3)
export const payoffAPI = {
  getAll: (params = {}) => api.get('/payoffs', { params }),
  getById: (id) => api.get(`/payoffs/${id}`),
  // Settling needs the payment slip, so it is sent as a form
  settle: (id, data = {}, slip) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') formData.append(key, value);
    });
    if (slip) formData.append('slip', slip);
    return api.patch(`/payoffs/${id}/settle`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  cancel: (id, data = {}) => api.patch(`/payoffs/${id}/cancel`, data),
  // A cancelled payoff is replaced by a new payoff for the same approved invoice
  replace: (id, data = {}) => api.post(`/payoffs/${id}/replace`, data),
  // The agent is paid only after the university has paid QStudy
  recordUniversityPayment: (id, data = {}) => api.patch(`/payoffs/${id}/university-payment`, data),
  // University payments are recorded per university (what each university owes QStudy)
  getUniversityReceivables: () => api.get('/payoffs/university-receivables'),
  recordReceivablePayment: (data) => api.post('/payoffs/university-receivables/payments', data),
  reverseReceivablePayment: (id, data = {}) => api.patch(`/payoffs/university-receivables/payments/${id}/reverse`, data),
  authorizeBypass: (id, data = {}) => api.patch(`/payoffs/${id}/bypass-block`, data),
  downloadSlip: (id, params = {}) => api.get(`/payoffs/${id}/slip`, { params, responseType: 'blob' })
};

// Global search (everyone; the server limits results to what the person may open)
export const searchAPI = {
  search: (q, params = {}) => api.get('/search', { params: { q, ...params } })
};

// Central audit log (Head of Admission, super admin)
export const auditAPI = {
  getAll: (params = {}) => api.get('/audit-logs', { params })
};

// Student Verification APIs (Phase H)
export const studentVerificationAPI = {
  getQueue: (params = {}) => api.get('/students/verification/queue', { params }),
  getByStudentId: (studentId) => api.get(`/students/${studentId}/verification`),
  getHistory: (studentId) => api.get(`/students/${studentId}/verification/history`),
  initiate: (studentId, data = {}) => api.patch(`/students/${studentId}/verification/initiate`, data),
  verify: (studentId, data = {}) => api.patch(`/students/${studentId}/verification/verify`, data),
  reject: (studentId, data = {}) => {
    const payload = typeof data === 'string' ? { reason: data } : data;
    return api.patch(`/students/${studentId}/verification/reject`, payload);
  }
};

// Ticket APIs
export const ticketAPI = {
  getAll: () => api.get('/tickets'),
  getById: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  addResponse: (id, message) => api.post(`/tickets/${id}/responses`, { message }),
  updateStatus: (id, status) => api.patch(`/tickets/${id}/status`, { status }),
  delete: (id) => api.delete(`/tickets/${id}`)
};

// Team (staff) APIs: super admin only
export const staffAPI = {
  list: () => api.get('/staff'),
  update: (id, data) => api.patch(`/staff/${id}`, data),
  resetPassword: (id, password) => api.post(`/staff/${id}/reset-password`, { password })
};

// Live chat APIs
export const chatAPI = {
  config: () => api.get('/chat/config'),
  // channel: 'direct' (agent and their Account Manager) or 'support' (general helpdesk)
  getMine: (channel, after, markRead = true) => api.get('/chat/me', { params: { channel, ...(after ? { after } : {}), ...(markRead ? {} : { markRead: false }) } }),
  sendMine: (channel, body) => api.post('/chat/me', { channel, body }),
  unreadMine: () => api.get('/chat/me/unread'),
  access: () => api.get('/chat/access'),
  conversations: (channel) => api.get('/chat/conversations', { params: { channel } }),
  agents: (channel) => api.get('/chat/agents', { params: { channel } }),
  getConversation: (channel, agentId, after) => api.get(`/chat/conversations/${agentId}`, { params: { channel, ...(after ? { after } : {}) } }),
  reply: (channel, agentId, body) => api.post(`/chat/conversations/${agentId}`, { channel, body })
};

// Notification APIs
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all')
};

export default api;

// Bulk import of universities and programs from a spreadsheet (rows are sent in small batches)
export const importAPI = {
  universities: (rows, dryRun) => api.post('/imports/universities', { rows, dryRun }),
  programs: (rows, dryRun) => api.post('/imports/programs', { rows, dryRun })
};
