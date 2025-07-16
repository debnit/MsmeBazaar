import { useState, useEffect, useCallback } from 'react';
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  const getToken = useCallback(() => {
    // Improved token fallback strategy
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
      
      return { success: false, error: error.message };
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

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
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
      
      return { success: false, error: error.message };
    }
  }, [setToken]);

  const switchRole = useCallback(async (newRole: string) => {
    if (!state.user || state.user.role !== 'admin') {
      throw new Error('Only administrators can switch roles');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiRequest('/api/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({ role: newRole })
      });

      const { user } = response;
      setState(prev => ({
        ...prev,
        user,
        isLoading: false,
        error: null
      }));

      return { success: true, user };
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Role switch failed'
      }));
      
      throw error;
    }
  }, [state.user]);

  const refreshUser = useCallback(async () => {
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
      // Handle auth failures
      if (error.status === 401 || error.status === 403) {
        removeToken();
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to refresh user'
        }));
      }
    }
  }, [getToken, removeToken]);

  const hasPermission = useCallback((permission: string) => {
    if (!state.user) return false;
    if (state.user.role === 'admin') return true;
    return state.user.permissions?.includes(permission) || false;
  }, [state.user]);

  const hasAnyPermission = useCallback((permissions: string[]) => {
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return {
    ...state,
    login,
    logout,
    register,
    switchRole,
    refreshUser,
    hasPermission,
    hasAnyPermission,
    getToken,
    isAdmin: state.user?.role === 'admin'
  };
}