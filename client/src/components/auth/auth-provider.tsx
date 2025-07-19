import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api-client';

interface User {
  id: number;
  email: string;
  role: 'admin' | 'seller' | 'buyer' | 'agent' | 'nbfc';
  name: string;
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  getToken: () => string | null;
  setToken: (token: string, remember?: boolean) => void;
  removeToken: () => void;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  const getToken = useCallback(() => {
    return localStorage.getItem('token') || 
           sessionStorage.getItem('token') || 
           null;
  }, []);

  const setToken = useCallback((token: string, remember: boolean = true) => {
    if (remember) {
      localStorage.setItem('token', token);
      sessionStorage.removeItem('token');
    } else {
      sessionStorage.setItem('token', token);
      localStorage.removeItem('token');
    }
  }, []);

  const removeToken = useCallback(() => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean = true) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const { user, token } = response;
      setToken(token, remember);
      
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      return { success: true, user };
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed'
      }));
      
      return { success: false, error: error.message || 'Login failed' };
    }
  }, [setToken]);

  const register = useCallback(async (data: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      const { user, token } = response;
      setToken(token);
      
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      return { success: true, user };
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed'
      }));
      
      return { success: false, error: error.message || 'Registration failed' };
    }
  }, [setToken]);

  const logout = useCallback(() => {
    removeToken();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }, [removeToken]);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const user = await apiRequest('/api/auth/me');
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Auth check failed:', error);
      removeToken();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  }, [getToken, removeToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    checkAuth,
    getToken,
    setToken,
    removeToken,
    isAdmin: state.user?.role === 'admin' || state.user?.role === 'super_admin',
    hasPermission: (permission: string) => {
      if (!state.user) return false;
      if (state.user.role === 'super_admin') return true;
      if (state.user.role === 'admin') {
        // Define admin permissions
        const adminPermissions = ['view_dashboard', 'manage_users', 'view_reports', 'manage_msmes'];
        return adminPermissions.includes(permission);
      }
      return false;
    }
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}