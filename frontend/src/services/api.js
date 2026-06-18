import axios from 'axios';

// Use environment variable or default API URL (Vite-compatible)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 420000, // Increased to 7 minutes for large document processing
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common error cases
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');
    // Hanya redirect bila sesi benar-benar kedaluwarsa (token lama tidak valid),
    // BUKAN saat percobaan login gagal — biar pesan error bisa tampil, bukan refresh.
    if (status === 401 && !isAuthAttempt && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Submissions API
export const getAllSubmissions = async (params = {}) => {
  const response = await api.get('/submissions', { params });
  return response.data;
};

export const getSubmissionById = async (submissionId) => {
  const response = await api.get(`/submissions/${submissionId}`);
  return response.data;
};

export const createSubmission = async (formData, onProgress = null) => {
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 1200000, // 20 menit: cover full RAG (embedding + retry 429 + analisis AI) agar respons HTTP jadi sumber kebenaran, tidak bergantung WS
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress({ stage: 'uploading', progress: percentCompleted });
      }
    }
  });
  return response.data;
};

export const setDecision = async (submissionId, decisionData) => {
  const response = await api.post(`/submissions/${submissionId}/decision`, decisionData);
  return response.data;
};

// Assignment APIs
export const getUsers = async (params = {}) => {
  const response = await api.get('/users', { params });
  return response.data;
};

export const assignAssessor = async (submissionId, payload) => {
  const response = await api.post(`/submissions/${submissionId}/assign`, payload);
  return response.data;
};

export const getAssignment = async (submissionId) => {
  const response = await api.get(`/submissions/${submissionId}/assign`);
  return response.data;
};

export const acceptAssignment = async (submissionId) => {
  const response = await api.post(`/submissions/${submissionId}/assign/accept`);
  return response.data;
};

export const rejectAssignment = async (submissionId, payload = {}) => {
  const response = await api.post(`/submissions/${submissionId}/assign/reject`, payload);
  return response.data;
};

// Scoring API
export const autoScoreDocuments = async (formData) => {
  // Deprecated
  throw new Error('auto-score endpoint is not available');
};

export const getScoringResult = async (scoringId) => {
  const response = await api.get(`/scoring/${scoringId}`);
  return response.data;
};

export const manualScore = async (payload) => {
  const response = await api.post('/scoring/manual', payload);
  return response.data;
};

// Payment APIs
export const checkPaymentStatus = async () => {
  const response = await api.get('/sekretariat/payments/check-status');
  return response.data;
};

export const getMyPayments = async () => {
  const response = await api.get('/sekretariat/payments/my');
  return response.data;
};

export const uploadPaymentProof = async (paymentId, formData) => {
  const response = await api.post(`/sekretariat/payments/${paymentId}/upload-proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// Export the API instance for direct use if needed
export default api;
