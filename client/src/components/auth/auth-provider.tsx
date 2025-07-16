import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

// Create Auth Context
const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null);

// AuthProvider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}