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

// Valuation Types
export interface ValuationRequest {
  businessId: string;
  method: 'dcf' | 'market' | 'asset' | 'hybrid';
  financialData: {
    annualRevenue: number;
    netProfit: number;
    totalAssets: number;
    totalLiabilities: number;
    growthRate?: number;
  };
  marketData?: {
    industryMultiple?: number;
    comparableCompanies?: string[];
  };
}

export interface Valuation {
  id: string;
  businessId: string;
  method: string;
  valuationAmount: number;
  confidenceLevel: number;
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    value?: any;
  }>;
  createdAt: string;
  validUntil: string;
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
  collateralDetails?: Record<string, any>;
  guarantorDetails?: Record<string, any>;
}

export interface LoanApplicationRequest {
  businessId: string;
  loanType: 'working_capital' | 'term_loan' | 'equipment_finance' | 'invoice_discounting' | 'trade_credit';
  amount: number;
  tenureMonths: number;
  purpose: string;
  collateralDetails?: Record<string, any>;
  guarantorDetails?: Record<string, any>;
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
  preferences?: Record<string, any>;
}

// Investment Types
export interface Investment {
  id: string;
  businessId: string;
  investorId: string;
  amount: number;
  equity: number;
  type: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'debt' | 'convertible';
  status: 'proposed' | 'negotiating' | 'due_diligence' | 'completed' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// Matching Types
export interface MatchCriteria {
  industry?: string[];
  location?: string[];
  revenueRange?: {
    min: number;
    max: number;
  };
  valuationRange?: {
    min: number;
    max: number;
  };
  investmentType?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface Match {
  id: string;
  businessId: string;
  investorId: string;
  matchScore: number;
  factors: Array<{
    factor: string;
    score: number;
    weight: number;
  }>;
  status: 'pending' | 'viewed' | 'interested' | 'contacted' | 'rejected';
  createdAt: string;
}

// Analytics Types
export interface BusinessMetrics {
  totalBusinesses: number;
  totalValuation: number;
  totalInvestments: number;
  totalLoans: number;
  averageValuation: number;
  industryBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// File Upload Types
export interface FileUpload {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface DocumentUpload {
  type: 'financial_statement' | 'bank_statement' | 'kyc_document' | 'collateral_document' | 'other';
  file: FileUpload;
  verified: boolean;
  verifiedAt?: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}