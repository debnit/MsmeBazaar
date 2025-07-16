import { apiRequest } from "./queryClient";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
}

export interface AuthResponse {
  user: any;
  token: string;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/login", credentials);
  const data = await response.json();
  
  // Store token in localStorage
  localStorage.setItem("auth_token", data.token);
  
  return data;
}

export async function register(userData: RegisterData): Promise<AuthResponse> {
  const response = await apiRequest("POST", "/api/auth/register", userData);
  const data = await response.json();
  
  // Store token in localStorage
  localStorage.setItem("auth_token", data.token);
  
  return data;
}

export function logout(): void {
  localStorage.removeItem("auth_token");
  window.location.href = "/";
}

export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
