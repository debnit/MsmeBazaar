import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

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
      const response = await api.auth.login({ email, password });
      const { user, token } = response.data;
      
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
        error: error.response?.data?.message || error.message || 'Login failed'
      }));
      
      return { success: false, error: error.response?.data?.message || error.message || 'Login failed' };
    }
  }, [setToken]);

  const register = useCallback(async (data: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await api.auth.register(data);
      const { user, token } = response.data;
      
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
        error: error.response?.data?.message || error.message || 'Registration failed'
      }));
      
      return { success: false, error: error.response?.data?.message || error.message || 'Registration failed' };
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
      const response = await api.auth.me();
      const user = response.data;
      
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Auth check failed:', error);
      
      // If it's a network error or API is not available, don't remove token immediately
      // Just set user as not authenticated but keep token for retry
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Unable to verify authentication. Please try again later.'
        });
      } else {
        // For 401/403 errors, remove token
        removeToken();
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    }
  }, [getToken, removeToken]);

  useEffect(() => {
    // Add timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      setState(prev => {
        if (prev.isLoading) {
          return {
            ...prev,
            isLoading: false,
            error: 'Authentication check timed out'
          };
        }
        return prev;
      });
    }, 10000); // 10 second timeout

    checkAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => clearTimeout(timeoutId);
  }, [checkAuth]);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    checkAuth,
    getToken,
    setToken,
    removeToken
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