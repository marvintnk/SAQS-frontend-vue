import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

// Create a configured axios instance
// Using a relative URL to allow Vite proxy to handle the target
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Response interceptor for better error handling if needed
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
