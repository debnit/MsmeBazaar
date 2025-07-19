// API Client - Basic implementation for development
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const dashboardApi = {
  getStats: () => apiClient.get('/dashboard/stats'),
  getRecentActivity: () => apiClient.get('/dashboard/activity'),
};

export const msmeApi = {
  getListings: (params?: any) => apiClient.get('/msme/listings', { params }),
  createListing: (data: any) => apiClient.post('/msme/listings', data),
  updateListing: (id: string, data: any) => apiClient.put(`/msme/listings/${id}`, data),
  deleteListing: (id: string) => apiClient.delete(`/msme/listings/${id}`),
  getListing: (id: string) => apiClient.get(`/msme/listings/${id}`),
};

export const nbfcApi = {
  getLoanApplications: (params?: any) => apiClient.get('/nbfc/applications', { params }),
  updateApplication: (id: string, data: any) => apiClient.put(`/nbfc/applications/${id}`, data),
  getApplication: (id: string) => apiClient.get(`/nbfc/applications/${id}`),
};

export const loanApi = {
  createApplication: (data: any) => apiClient.post('/loan/applications', data),
  getApplications: (params?: any) => apiClient.get('/loan/applications', { params }),
  getApplication: (id: string) => apiClient.get(`/loan/applications/${id}`),
  updateApplication: (id: string, data: any) => apiClient.put(`/loan/applications/${id}`, data),
};

export const authApi = {
  login: (credentials: any) => apiClient.post('/auth/login', credentials),
  register: (userData: any) => apiClient.post('/auth/register', userData),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
};

export default apiClient;
