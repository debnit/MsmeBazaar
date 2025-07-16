import React, { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { authService, type AuthUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { resourceManager } from "@/utils/resource-manager";
import { queryClient } from "@/lib/queryClient";

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  loginMutation: UseMutationResult<any, Error, { email: string; password: string }>;
  logoutMutation: UseMutationResult<void, Error, void>;
  sendOTPMutation: UseMutationResult<any, Error, string>;
  verifyOTPMutation: UseMutationResult<any, Error, { phoneNumber: string; otp: string }>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use toast hook at the top level (following React rules)
  const { toast } = useToast();
  const [authResourceAcquired, setAuthResourceAcquired] = React.useState(false);

  // Acquire resource for auth provider
  React.useEffect(() => {
    const acquireResources = async () => {
      try {
        const acquired = await resourceManager.acquireResource('auth-provider', 'AuthProvider', 5000);
        setAuthResourceAcquired(acquired);
      } catch (error) {
        console.warn('Failed to acquire auth resource:', error);
      }
    };

    acquireResources();

    return () => {
      if (authResourceAcquired) {
        resourceManager.releaseResource('auth-provider', 'AuthProvider');
      }
    };
  }, [authResourceAcquired]);

  // Safe toast function that respects resource acquisition (synchronous)
  const safeToast = React.useCallback((props: any) => {
    if (authResourceAcquired) {
      toast(props);
    } else {
      // Fallback behavior when resource not acquired
      console.warn('Auth resource not acquired, skipping toast:', props.title);
    }
  }, [toast, authResourceAcquired]);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: authService.getCurrentUser,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      if (data.success && data.user) {
        queryClient.setQueryData(["/api/auth/me"], data.user);
        if (data.token) {
          authService.setToken(data.token);
        }
      }
    },
    onError: (error: Error) => {
      safeToast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      authService.removeToken();
    },
    onError: (error: Error) => {
      safeToast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendOTPMutation = useMutation({
    mutationFn: authService.sendOTP,
    onSuccess: (data) => {
      if (data.success) {
        safeToast({
          title: "OTP sent successfully",
          description: "Please check your phone for the verification code",
          variant: "success",
        });
      }
    },
    onError: (error: Error) => {
      safeToast({
        title: "Failed to send OTP",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: ({ phoneNumber, otp }: { phoneNumber: string; otp: string }) =>
      authService.verifyOTP(phoneNumber, otp),
    onSuccess: (data) => {
      if (data.success && data.user) {
        queryClient.setQueryData(["/api/auth/me"], data.user);
        if (data.token) {
          authService.setToken(data.token);
        }
      }
    },
    onError: (error: Error) => {
      safeToast({
        title: "OTP verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const contextValue = {
    user: user || null,
    isLoading,
    error,
    isAuthenticated: !!user,
    loginMutation,
    logoutMutation,
    sendOTPMutation,
    verifyOTPMutation,
  };

  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}