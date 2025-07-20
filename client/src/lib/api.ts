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

export const buyerApi = {
  getDashboard: () => apiClient.get('/buyer/dashboard'),
  getInterests: (params?: any) => apiClient.get('/buyer/interests', { params }),
  createInterest: (data: any) => apiClient.post('/buyer/interests', data),
  updateInterest: (id: string, data: any) => apiClient.put(`/buyer/interests/${id}`, data),
  deleteInterest: (id: string) => apiClient.delete(`/buyer/interests/${id}`),
};

export const usersApi = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data: any) => apiClient.put('/users/profile', data),
  getStats: () => apiClient.get('/users/stats'),
};

export const notificationsApi = {
  list: (params?: any) => apiClient.get('/notifications', { params }),
  markAsRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.put('/notifications/read-all'),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
};

// Query client for React Query (if used)
export const queryClient = {
  invalidateQueries: (key: string) => {
    console.log(`Invalidating queries for key: ${key}`);
    // Placeholder - would integrate with React Query
  },
  setQueryData: (key: string, data: any) => {
    console.log(`Setting query data for key: ${key}`, data);
    // Placeholder - would integrate with React Query
  },
};

// Query keys for consistent cache management
export const queryKeys = {
  dashboard: {
    stats: 'dashboard-stats',
    activity: 'dashboard-activity',
  },
  dashboardStats: () => 'dashboard-stats',
  userProfile: () => 'user-profile',
  msme: {
    listings: 'msme-listings',
    listing: (id: string) => `msme-listing-${id}`,
  },
  nbfc: {
    applications: 'nbfc-applications',
    application: (id: string) => `nbfc-application-${id}`,
  },
  loan: {
    applications: 'loan-applications',
    application: (id: string) => `loan-application-${id}`,
  },
  auth: {
    profile: 'auth-profile',
  },
  notifications: {
    list: 'notifications-list',
    unreadCount: 'notifications-unread-count',
  },
};

// Export the main API client as default
export default apiClient;

// Also export as named export for consistency
export const api = {
  ...apiClient,
  dashboard: dashboardApi,
  users: usersApi,
  notifications: notificationsApi,
  msme: msmeApi,
  nbfc: nbfcApi,
  loan: loanApi,
  auth: authApi,
  buyer: buyerApi,
};
