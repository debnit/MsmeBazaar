import React, { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { authService, type AuthUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

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
      toast({
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
      toast({
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
        toast({
          title: "OTP sent successfully",
          description: "Please check your phone for the verification code",
        });
      }
    },
    onError: (error: Error) => {
      toast({
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
      toast({
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