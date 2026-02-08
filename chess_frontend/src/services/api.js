/* istanbul ignore file */
import axios from 'axios';
import { getToken } from '../utils/storage';
import { API_BASE_URL } from '../utils/apiBase';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error instanceof Error ? error : new Error(JSON.stringify(error)));

  } 
);

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Handle 401 unauthorized errors
    if (error.response && error.response.status === 401) {
      // Maybe redirect to login or refresh token here
      console.error('Authentication error - please log in again');
    }
    return Promise.reject(error instanceof Error ? error : new Error(JSON.stringify(error)));
  }
);

export default api;