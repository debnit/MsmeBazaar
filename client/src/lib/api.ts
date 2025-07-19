import { QueryClient } from '@tanstack/react-query';
import { globalToast } from './toast';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = 30000; // 30 seconds

// API Client Class
class APIClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string, timeout: number = API_TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle HTTP errors
      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // Handle specific error codes
        if (response.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('auth_token');
          globalToast.error('Session expired', 'Please log in again');
          window.location.href = '/auth';
          throw new Error('Unauthorized');
        } else if (response.status === 403) {
          globalToast.error('Access denied', 'You don\'t have permission to perform this action');
          throw new Error('Forbidden');
        } else if (response.status === 404) {
          throw new Error('Resource not found');
        } else if (response.status >= 500) {
          globalToast.error('Server error', 'Please try again later');
          throw new Error('Server error');
        }

        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(url.pathname + url.search, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // File upload
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get auth token
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout * 2); // Double timeout for uploads

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Upload timeout');
      }

      throw error;
    }
  }
}

// Create API client instance
export const apiClient = new APIClient(API_BASE_URL);

// Type definitions for API responses
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'seller' | 'buyer' | 'agent' | 'nbfc' | 'admin';
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MSME {
  id: string;
  companyName: string;
  businessType: string;
  industryCategory: string;
  gstin: string;
  pan: string;
  annualTurnover: number;
  employeeCount: number;
  verified: boolean;
  rating: number;
  location: {
    city: string;
    state: string;
    pincode: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ValuationRequest {
  id: string;
  msmeId: string;
  userId: string;
  purpose: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  estimatedValue?: number;
  reportUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface APIResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API endpoints
export const api = {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post<APIResponse<{ user: User; token: string }>>('/auth/login', credentials),
    
    register: (userData: any) =>
      apiClient.post<APIResponse<{ user: User; token: string }>>('/auth/register', userData),
    
    logout: () =>
      apiClient.post<APIResponse<null>>('/auth/logout'),
    
    refreshToken: () =>
      apiClient.post<APIResponse<{ token: string }>>('/auth/refresh'),
    
    forgotPassword: (email: string) =>
      apiClient.post<APIResponse<null>>('/auth/forgot-password', { email }),
    
    resetPassword: (token: string, password: string) =>
      apiClient.post<APIResponse<null>>('/auth/reset-password', { token, password }),
    
    verifyOTP: (phone: string, otp: string) =>
      apiClient.post<APIResponse<null>>('/auth/verify-otp', { phone, otp }),
    
    sendOTP: (phone: string) =>
      apiClient.post<APIResponse<null>>('/auth/send-otp', { phone }),
  },

  // User management
  users: {
    getProfile: () =>
      apiClient.get<APIResponse<User>>('/users/profile'),
    
    updateProfile: (data: Partial<User>) =>
      apiClient.put<APIResponse<User>>('/users/profile', data),
    
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post<APIResponse<null>>('/users/change-password', data),
    
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return apiClient.upload<APIResponse<{ url: string }>>('/users/avatar', formData);
    },
  },

  // MSME management
  msmes: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      industry?: string;
      location?: string;
      verified?: boolean;
    }) =>
      apiClient.get<APIResponse<PaginatedResponse<MSME>>>('/msmes', params),
    
    get: (id: string) =>
      apiClient.get<APIResponse<MSME>>(`/msmes/${id}`),
    
    create: (data: any) =>
      apiClient.post<APIResponse<MSME>>('/msmes', data),
    
    update: (id: string, data: Partial<MSME>) =>
      apiClient.put<APIResponse<MSME>>(`/msmes/${id}`, data),
    
    delete: (id: string) =>
      apiClient.delete<APIResponse<null>>(`/msmes/${id}`),
    
    uploadDocument: (id: string, file: File, category: string) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('category', category);
      return apiClient.upload<APIResponse<{ url: string }>>(`/msmes/${id}/documents`, formData);
    },
    
    getDocuments: (id: string) =>
      apiClient.get<APIResponse<Array<{ id: string; category: string; url: string; uploadedAt: string }>>>(`/msmes/${id}/documents`),
  },

  // Valuation services
  valuations: {
    list: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      purpose?: string;
    }) =>
      apiClient.get<APIResponse<PaginatedResponse<ValuationRequest>>>('/valuations', params),
    
    get: (id: string) =>
      apiClient.get<APIResponse<ValuationRequest>>(`/valuations/${id}`),
    
    create: (data: any) =>
      apiClient.post<APIResponse<ValuationRequest>>('/valuations', data),
    
    update: (id: string, data: Partial<ValuationRequest>) =>
      apiClient.put<APIResponse<ValuationRequest>>(`/valuations/${id}`, data),
    
    cancel: (id: string) =>
      apiClient.post<APIResponse<null>>(`/valuations/${id}/cancel`),
    
    getReport: (id: string) =>
      apiClient.get<Blob>(`/valuations/${id}/report`),
  },

  // Analytics and dashboard
  dashboard: {
    getStats: () =>
      apiClient.get<APIResponse<{
        totalMSMEs: number;
        totalValuations: number;
        avgValuation: number;
        growthRate: number;
      }>>('/dashboard/stats'),
    
    getChartData: (period: '7d' | '30d' | '90d' | '1y') =>
      apiClient.get<APIResponse<Array<{ date: string; value: number }>>>('/dashboard/chart', { period }),
  },

  // File uploads
  files: {
    upload: (file: File, category?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (category) formData.append('category', category);
      return apiClient.upload<APIResponse<{ url: string; id: string }>>('/files/upload', formData);
    },
    
    delete: (id: string) =>
      apiClient.delete<APIResponse<null>>(`/files/${id}`),
  },

  // Search and filters
  search: {
    msmes: (query: string, filters?: Record<string, any>) =>
      apiClient.get<APIResponse<MSME[]>>('/search/msmes', { q: query, ...filters }),
    
    suggestions: (query: string) =>
      apiClient.get<APIResponse<string[]>>('/search/suggestions', { q: query }),
  },

  // Notifications
  notifications: {
    list: (params?: { page?: number; limit?: number; unread?: boolean }) =>
      apiClient.get<APIResponse<PaginatedResponse<{
        id: string;
        title: string;
        message: string;
        type: 'info' | 'success' | 'warning' | 'error';
        read: boolean;
        createdAt: string;
      }>>>('/notifications', params),
    
    markAsRead: (id: string) =>
      apiClient.post<APIResponse<null>>(`/notifications/${id}/read`),
    
    markAllAsRead: () =>
      apiClient.post<APIResponse<null>>('/notifications/read-all'),
  },
};

// Query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.message?.includes('4')) return false;
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      onError: (error: any) => {
        // Global error handling for mutations
        if (error?.message && !error.message.includes('Unauthorized')) {
          globalToast.error('Operation failed', error.message);
        }
      },
    },
  },
});

// Query keys factory
export const queryKeys = {
  all: ['api'] as const,
  
  users: () => [...queryKeys.all, 'users'] as const,
  user: (id: string) => [...queryKeys.users(), id] as const,
  userProfile: () => [...queryKeys.users(), 'profile'] as const,
  
  msmes: () => [...queryKeys.all, 'msmes'] as const,
  msme: (id: string) => [...queryKeys.msmes(), id] as const,
  msmesList: (params?: any) => [...queryKeys.msmes(), 'list', params] as const,
  msmeDocuments: (id: string) => [...queryKeys.msme(id), 'documents'] as const,
  
  valuations: () => [...queryKeys.all, 'valuations'] as const,
  valuation: (id: string) => [...queryKeys.valuations(), id] as const,
  valuationsList: (params?: any) => [...queryKeys.valuations(), 'list', params] as const,
  
  dashboard: () => [...queryKeys.all, 'dashboard'] as const,
  dashboardStats: () => [...queryKeys.dashboard(), 'stats'] as const,
  dashboardChart: (period: string) => [...queryKeys.dashboard(), 'chart', period] as const,
  
  notifications: () => [...queryKeys.all, 'notifications'] as const,
  notificationsList: (params?: any) => [...queryKeys.notifications(), 'list', params] as const,
  
  search: () => [...queryKeys.all, 'search'] as const,
  searchMsmes: (query: string, filters?: any) => [...queryKeys.search(), 'msmes', query, filters] as const,
  searchSuggestions: (query: string) => [...queryKeys.search(), 'suggestions', query] as const,
};

// Error boundary for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Utility functions
export const downloadFile = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    globalToast.error('Download failed', 'Please try again later');
    throw error;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const isValidFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

// Export API aliases for backward compatibility
export const msmeApi = api;
export const dashboardApi = api;
export const nbfcApi = api;
export const loanApi = api;
export const agentApi = api;
export const adminApi = api;
export const buyerApi = api;
export const sellerApi = api;
export const vaasApi = api;
export const analyticsApi = api;
