import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const authClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface RegisterRequest {
  phone: string;
  name?: string;
  email?: string;
  role: 'MSME' | 'BUYER' |'AGENT' | 'USER';
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
  purpose: 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET' | 'PHONE_VERIFICATION';
}

export interface LoginRequest {
  phone: string;
}

export interface ResendOTPRequest {
  phone: string;
  purpose: 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET' | 'PHONE_VERIFICATION';
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface User {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  role: 'MSME' | 'BUYER' | 'ADMIN' | 'SUPER_ADMIN';
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface OTPResponse {
  success: boolean;
  message: string;
  expires_in: number;
  can_resend_in?: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  database: string;
  redis: string;
}

// Auth API methods
export const authApi = {
  // Register new user
  async register(data: RegisterRequest): Promise<OTPResponse> {
    const response = await authClient.post('/api/register', data);
    return response.data;
  },

  // Verify OTP
  async verifyOTP(data: VerifyOTPRequest): Promise<TokenResponse> {
    const response = await authClient.post('/api/verify-otp', data);
    return response.data;
  },

  // Login user
  async login(data: LoginRequest): Promise<OTPResponse> {
    const response = await authClient.post('/api/login', data);
    return response.data;
  },

  // Resend OTP
  async resendOTP(data: ResendOTPRequest): Promise<OTPResponse> {
    const response = await authClient.post('/api/resend-otp', data);
    return response.data;
  },

  // Refresh token
  async refreshToken(data: RefreshTokenRequest): Promise<TokenResponse> {
    const response = await authClient.post('/api/refresh-token', data);
    return response.data;
  },

  // Logout
  async logout(refreshToken: string): Promise<{ message: string }> {
    const response = await authClient.post('/api/logout', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // Health check
  async health(): Promise<HealthResponse> {
    const response = await authClient.get('/health');
    return response.data;
  },
};

// Request interceptor to add auth token
authClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
authClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (refreshToken) {
          try {
            const response = await authApi.refreshToken({ refresh_token: refreshToken });
            
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('refresh_token', response.refresh_token);
            
            originalRequest.headers.Authorization = `Bearer ${response.access_token}`;
            return authClient(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
        } else {
          // No refresh token, redirect to login
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default authClient;