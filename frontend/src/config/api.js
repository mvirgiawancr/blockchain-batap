// Centralized API configuration
// This file exports the base URL for all API calls

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

// Helper function for making API calls
export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
