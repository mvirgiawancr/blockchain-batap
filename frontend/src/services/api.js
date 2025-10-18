import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

console.log('[API] Base URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000, // 3 minutes timeout for large file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadDocuments = async (formData) => {
  console.log('[API] uploadDocuments called with formData:', formData);
  console.log('[API] FormData entries:');
  for (let pair of formData.entries()) {
    console.log(`  ${pair[0]}:`, pair[1]);
  }
  
  console.log('[API] Sending POST request to /api/v1/upload...');
  
  try {
    const response = await apiClient.post('/api/v1/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('[API] Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('[API] Upload error:', error);
    console.error('[API] Error response:', error.response);
    throw error;
  }
};

export const getSubmission = async (submissionId) => {
  const response = await apiClient.get(`/api/v1/submissions/${submissionId}`);
  return response.data;
};

export const getAllSubmissions = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.institusi) params.append('institusi', filters.institusi);
  
  const response = await apiClient.get(`/api/v1/submissions?${params.toString()}`);
  return response.data;
};

export const setDecision = async (submissionId, decision) => {
  const response = await apiClient.post(
    `/api/v1/submissions/${submissionId}/decision`,
    decision
  );
  return response.data;
};

export const getSubmissionHistory = async (submissionId) => {
  const response = await apiClient.get(`/api/v1/submissions/${submissionId}/history`);
  return response.data;
};

export default apiClient;
