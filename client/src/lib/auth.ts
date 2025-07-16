import { apiRequest } from './queryClient';

export interface AuthUser {
  id: number;
  email?: string;
  phone?: string;
  role: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  authMethod: 'email' | 'mobile';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface MobileAuthRequest {
  phoneNumber: string;
  otp?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
}

export const authService = {
  // Email authentication
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  // Mobile authentication
  async sendOTP(phoneNumber: string): Promise<AuthResponse> {
    return await apiRequest('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    });
  },

  async verifyOTP(phoneNumber: string, otp: string): Promise<AuthResponse> {
    return await apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otp })
    });
  },

  async resendOTP(phoneNumber: string): Promise<AuthResponse> {
    return await apiRequest('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    });
  },

  // Common auth functions
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await apiRequest('/api/auth/me');
      return response.user || null;
    } catch (error) {
      return null;
    }
  },

  async logout(): Promise<void> {
    await apiRequest('/api/auth/logout', {
      method: 'POST'
    });
    localStorage.removeItem('token');
  },

  // Token management
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  setToken(token: string): void {
    localStorage.setItem('token', token);
  },

  removeToken(): void {
    localStorage.removeItem('token');
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}