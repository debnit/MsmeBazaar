import { apiRequest } from './queryClient';

export interface AuthUser {
  id: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: 'buyer' | 'seller' | 'agent' | 'admin' | 'nbfc';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
}

export interface OTPResponse {
  success: boolean;
  message: string;
}

class AuthService {
  private tokenKey = 'msme_auth_token';

  // Token management
  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
    // Also set as cookie for server-side requests
    document.cookie = `auth_token=${token}; path=/; secure; samesite=strict`;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  removeToken() {
    localStorage.removeItem(this.tokenKey);
    // Remove cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  }

  // API methods
  async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
    try {
      const response = await apiRequest('POST', '/api/auth/login', credentials);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  }

  async register(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role: string;
  }): Promise<LoginResponse> {
    try {
      const response = await apiRequest('POST', '/api/auth/register', userData);
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await apiRequest('POST', '/api/auth/logout');
    } catch (error) {
      // Continue with logout even if server request fails
      console.error('Logout request failed:', error);
    } finally {
      this.removeToken();
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await apiRequest('GET', '/api/auth/me');
      return response;
    } catch (error) {
      // If token is invalid, remove it
      this.removeToken();
      return null;
    }
  }

  async sendOTP(phoneNumber: string): Promise<OTPResponse> {
    try {
      const response = await apiRequest('POST', '/api/auth/send-otp', { phoneNumber });
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to send OTP');
    }
  }

  async verifyOTP(phoneNumber: string, otp: string): Promise<LoginResponse> {
    try {
      const response = await apiRequest('POST', '/api/auth/verify-otp', { phoneNumber, otp });
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'OTP verification failed');
    }
  }

  async resendOTP(phoneNumber: string): Promise<OTPResponse> {
    try {
      const response = await apiRequest('POST', '/api/auth/resend-otp', { phoneNumber });
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to resend OTP');
    }
  }

  async refreshToken(): Promise<LoginResponse> {
    try {
      const response = await apiRequest('POST', '/api/auth/refresh');
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async checkPermission(requiredRole: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      // Admin has access to everything
      if (user.role === 'admin') return true;

      // Check specific role
      return user.role === requiredRole;
    } catch (error) {
      return false;
    }
  }
}

export const authService = new AuthService();

// Authentication helper for API requests
export function getAuthHeaders(): HeadersInit {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Higher-order component for route protection
export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  requiredRole?: string
) {
  return function AuthenticatedComponent(props: T) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const user = await authService.getCurrentUser();
          if (!user) {
            window.location.href = '/auth/login';
            return;
          }

          if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
            window.location.href = '/unauthorized';
            return;
          }

          setIsAuthorized(true);
        } catch (error) {
          window.location.href = '/auth/login';
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    }, []);

    if (isLoading) {
      return React.createElement(
        'div',
        { className: 'flex items-center justify-center h-screen' },
        React.createElement('div', { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600' })
      );
    }

    if (!isAuthorized) {
      return null;
    }

    return React.createElement(Component, props);
  };
}

// React hooks
import React, { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    register: authService.register.bind(authService),
    sendOTP: authService.sendOTP.bind(authService),
    verifyOTP: authService.verifyOTP.bind(authService),
    resendOTP: authService.resendOTP.bind(authService),
  };
}