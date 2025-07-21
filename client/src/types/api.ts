// API response types and interfaces

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  status: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status: number;
  details?: any;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'seller' | 'buyer' | 'agent' | 'admin' | 'nbfc';
  avatar?: string;
  phone?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: User['role'];
  phone?: string;
}

// MSME Listing types
export interface MSMEListing {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  price: number;
  currency: string;
  location: {
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  images: string[];
  specifications: Record<string, any>;
  sellerId: string;
  seller: User;
  status: 'active' | 'inactive' | 'sold' | 'pending';
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  category: string;
  subCategory: string;
  price: number;
  currency: string;
  location: MSMEListing['location'];
  images: string[];
  specifications: Record<string, any>;
}

// Loan Application types
export interface LoanApplication {
  id: string;
  applicantId: string;
  applicant: User;
  loanAmount: number;
  purpose: string;
  businessType: string;
  annualRevenue: number;
  creditScore?: number;
  documents: {
    name: string;
    url: string;
    type: string;
  }[];
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  nbfcId?: string;
  nbfc?: User;
  remarks?: string;
  approvedAmount?: number;
  interestRate?: number;
  tenure?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanApplicationRequest {
  loanAmount: number;
  purpose: string;
  businessType: string;
  annualRevenue: number;
  documents: {
    name: string;
    url: string;
    type: string;
  }[];
}

// Dashboard types
export interface DashboardStats {
  totalListings: number;
  totalApplications: number;
  totalRevenue: number;
  totalUsers: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'listing_created' | 'application_submitted' | 'application_approved' | 'payment_received';
  title: string;
  description: string;
  timestamp: string;
  userId: string;
  user: User;
}

// Search and Filter types
export interface SearchFilters {
  category?: string;
  subCategory?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  status?: string;
  sortBy?: 'price' | 'date' | 'views' | 'likes';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchRequest {
  query?: string;
  filters?: SearchFilters;
  page?: number;
  limit?: number;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

// File upload types
export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

// Generic utility types
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export interface RequestState<T = any> {
  data?: T;
  loading: boolean;
  error?: string | ApiError;
  status: RequestStatus;
}

// Export type guards
export function isApiError(error: any): error is ApiError {
  return error && typeof error === 'object' && 'message' in error && 'status' in error;
}

export function isApiResponse<T>(response: any): response is ApiResponse<T> {
  return response && typeof response === 'object' && 'data' in response && 'success' in response;
}

export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return response && typeof response === 'object' && 'data' in response && 'pagination' in response;
}