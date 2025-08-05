// apps/web/lib/api/client.ts
import axios, { AxiosRequestConfig } from 'axios';

const API_GATEWAY_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '/api';

const apiClient = axios.create({
  baseURL: API_GATEWAY_BASE_URL,
  timeout: 10000,
  withCredentials: true, // send httpOnly cookies, if used by your gateway
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // Optionally add correlation ID or auth headers here if needed
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  response => response,
  error => {
    // Optional: centralized error handling
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
