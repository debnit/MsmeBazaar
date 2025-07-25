// Base API Response
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  status: 'success' | 'error';
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  businessId?: string;
  role: 'business_owner' | 'investor' | 'admin';
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  businessName?: string;
  role: 'business_owner' | 'investor';
}

// Business Types
export interface Business {
  id: string;
  name: string;
  description: string;
  industry: string;
  location: string;
  ownerId: string;
  revenue: number;
  employees: number;
  established: string;
  status: 'active' | 'inactive' | 'pending';
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessCreateRequest {
  name: string;
  description: string;
  industry: string;
  location: string;
  revenue: number;
  employees: number;
  established: string;
}

// Loan Types
export interface LoanApplication {
  id: string;
  businessId: string;
  loanType: 'working_capital' | 'term_loan' | 'equipment_finance' | 'invoice_discounting' | 'trade_credit';
  amount: number;
  tenureMonths: number;
  purpose: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
  riskScore?: number;
  interestRate?: number;
}

export interface LoanApplicationRequest {
  businessId: string;
  loanType: 'working_capital' | 'term_loan' | 'equipment_finance' | 'invoice_discounting' | 'trade_credit';
  amount: number;
  tenureMonths: number;
  purpose: string;
}

// Exit Strategy Types
export interface ExitStrategy {
  id: string;
  businessId: string;
  exitType: 'acquisition' | 'merger' | 'ipo' | 'strategic_sale' | 'management_buyout' | 'liquidation' | 'succession';
  targetValuation: number;
  timelineMonths: number;
  status: 'planning' | 'preparation' | 'marketing' | 'negotiation' | 'due_diligence' | 'closing' | 'completed' | 'cancelled';
  completionPercentage: number;
  estimatedCompletion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExitStrategyRequest {
  businessId: string;
  exitType: 'acquisition' | 'merger' | 'ipo' | 'strategic_sale' | 'management_buyout' | 'liquidation' | 'succession';
  targetValuation: number;
  timelineMonths: number;
  reasons: string[];
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}