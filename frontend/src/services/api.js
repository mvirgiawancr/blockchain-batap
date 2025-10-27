import axios from 'axios';

// Use environment variable or default API URL (Vite-compatible)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased to 2 minutes for large document processing
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
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
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

export const createSubmission = async (formData) => {
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 180000 // 3 minutes for large file uploads with full document analysis
  });
  return response.data;
};

export const setDecision = async (submissionId, decisionData) => {
  const response = await api.post(`/submissions/${submissionId}/decision`, decisionData);
  return response.data;
};

// Scoring API
export const autoScoreDocuments = async (formData) => {
  const response = await api.post('/auto-score', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 240000 // 4 minutes for comprehensive scoring analysis
  });
  return response.data;
};

export const getScoringResult = async (scoringId) => {
  const response = await api.get(`/scoring/${scoringId}`);
  return response.data;
};

// Export the API instance for direct use if needed
export default api;