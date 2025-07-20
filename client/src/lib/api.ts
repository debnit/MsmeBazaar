// API Client - Basic implementation for development
import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

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
  create: (data: any) => apiClient.post('/msme/listings', data), // Alias for compatibility
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

export const gamificationApi = {
  getUserAchievements: (userId?: string) => apiClient.get(`/gamification/achievements${userId ? `/${userId}` : ''}`),
  getUserProgress: (userId?: string) => apiClient.get(`/gamification/progress${userId ? `/${userId}` : ''}`),
  getUserLeaderboard: (params?: any) => apiClient.get('/gamification/leaderboard', { params }),
  getUserStats: (userId?: string) => apiClient.get(`/gamification/stats${userId ? `/${userId}` : ''}`),
  getLeaderboard: (params?: any) => apiClient.get('/gamification/leaderboard', { params }),
  getBadges: (userId?: string) => apiClient.get(`/gamification/badges${userId ? `/${userId}` : ''}`),
  getAchievements: (userId?: string) => apiClient.get(`/gamification/achievements${userId ? `/${userId}` : ''}`),
  claimReward: (rewardId: string) => apiClient.post(`/gamification/rewards/${rewardId}/claim`),
  getAvailableRewards: () => apiClient.get('/gamification/rewards'),
  updateProgress: (data: any) => apiClient.post('/gamification/progress', data),
};

export const filesApi = {
  upload: (file: File | FormData, options?: any) => {
    const formData = file instanceof FormData ? file : (() => {
      const fd = new FormData();
      fd.append('file', file);
      return fd;
    })();
    
    return apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...options,
    });
  },
  delete: (fileId: string) => apiClient.delete(`/files/${fileId}`),
  getUploadUrl: (filename: string) => apiClient.post('/files/upload-url', { filename }),
};

export const userApi = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data: any) => apiClient.put('/users/profile', data),
  getStats: () => apiClient.get('/users/stats'),
  getAchievements: () => apiClient.get('/users/achievements'),
  getProgress: () => apiClient.get('/users/progress'),
};

  // Create a proper QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  dashboard: {
    stats: 'dashboard-stats',
    activity: 'dashboard-activity',
  },
  dashboardStats: () => 'dashboard-stats',
  userProfile: () => 'user-profile',
  user: {
    profile: 'user-profile',
    stats: 'user-stats',
    achievements: 'user-achievements',
    progress: 'user-progress',
  },
  users: {
    profile: 'users-profile',
    stats: 'users-stats',
  },
  msme: {
    listings: 'msme-listings',
    listing: (id: string) => `msme-listing-${id}`,
  },
  msmes: {
    listings: 'msmes-listings',
    listing: (id: string) => `msmes-listing-${id}`,
    create: 'msmes-create',
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
  gamification: {
    achievements: 'gamification-achievements',
    progress: 'gamification-progress',
    leaderboard: 'gamification-leaderboard',
    rewards: 'gamification-rewards',
  },
  files: {
    upload: 'files-upload',
    list: 'files-list',
  },
};

// Export the main API client as default
export default apiClient;

// Also export as named export for consistency
export const api = {
  ...apiClient,
  dashboard: dashboardApi,
  user: userApi,
  users: usersApi,
  notifications: notificationsApi,
  msme: msmeApi,
  msmes: msmeApi, // Alias for compatibility
  nbfc: nbfcApi,
  loan: loanApi,
  auth: authApi,
  buyer: buyerApi,
  gamification: gamificationApi,
  files: filesApi,
  queryKeys,
};
