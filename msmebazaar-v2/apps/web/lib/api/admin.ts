import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance for admin API
const adminClient = axios.create({
  baseURL: `${API_URL}/admin`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types for admin dashboard
export interface MSMEOnboardingItem {
  id: string;
  company_name: string;
  business_type: string;
  industry: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  verification_level: 'BASIC' | 'DOCUMENT_VERIFIED' | 'FINANCIAL_VERIFIED' | 'FULL_VERIFIED';
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
}

export interface KYCVerificationItem {
  id: string;
  msme_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  msme: {
    company_name: string;
    user: {
      name: string;
      phone: string;
    };
  };
}

export interface ValuationRequest {
  id: string;
  msme_id: string;
  method: 'ML_MODEL' | 'RULE_BASED' | 'HYBRID' | 'MANUAL';
  estimated_value: number;
  confidence: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  updated_at: string;
  msme: {
    company_name: string;
    user: {
      name: string;
      phone: string;
    };
  };
  reports: {
    id: string;
    report_type: 'BASIC' | 'DETAILED' | 'PREMIUM';
    report_url?: string;
    generated_at: string;
  }[];
}

export interface DashboardStats {
  total_msmes: number;
  pending_approvals: number;
  kyc_pending: number;
  valuation_requests: number;
  monthly_registrations: number;
  monthly_growth: number;
  approval_rate: number;
  avg_processing_time: number;
}

export interface ChartData {
  registrations: {
    date: string;
    count: number;
  }[];
  industries: {
    name: string;
    count: number;
    percentage: number;
  }[];
  verification_levels: {
    level: string;
    count: number;
    percentage: number;
  }[];
  monthly_revenue: {
    month: string;
    revenue: number;
    transactions: number;
  }[];
}

export interface AdminDashboardData {
  stats: DashboardStats;
  charts: ChartData;
  recent_msmes: MSMEOnboardingItem[];
  pending_kyc: KYCVerificationItem[];
  valuation_requests: ValuationRequest[];
}

// Admin API methods
export const adminApi = {
  // Get dashboard overview data
  async getDashboardData(): Promise<AdminDashboardData> {
    const response = await adminClient.get('/dashboard');
    return response.data;
  },

  // MSME Onboarding Management
  async getMSMEOnboardingQueue(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    items: MSMEOnboardingItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    
    const response = await adminClient.get(`/msme-onboarding?${params}`);
    return response.data;
  },

  async updateMSMEStatus(
    msmeId: string,
    status: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await adminClient.put(`/msme-onboarding/${msmeId}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  // KYC Verification Management
  async getKYCVerificationQueue(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    items: KYCVerificationItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    
    const response = await adminClient.get(`/kyc-verification?${params}`);
    return response.data;
  },

  async updateDocumentStatus(
    documentId: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await adminClient.put(`/documents/${documentId}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  // Valuation Management
  async getValuationRequests(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    items: ValuationRequest[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    
    const response = await adminClient.get(`/valuations?${params}`);
    return response.data;
  },

  async triggerValuation(
    msmeId: string,
    method: 'ML_MODEL' | 'RULE_BASED' | 'HYBRID' | 'MANUAL'
  ): Promise<{ success: boolean; valuation_id: string }> {
    const response = await adminClient.post(`/valuations/trigger`, {
      msme_id: msmeId,
      method,
    });
    return response.data;
  },

  async overrideValuation(
    valuationId: string,
    estimatedValue: number,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await adminClient.put(`/valuations/${valuationId}/override`, {
      estimated_value: estimatedValue,
      notes,
    });
    return response.data;
  },

  // Analytics and Reports
  async getAnalytics(
    startDate: string,
    endDate: string
  ): Promise<ChartData> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    
    const response = await adminClient.get(`/analytics?${params}`);
    return response.data;
  },

  async exportReport(
    type: 'msme' | 'kyc' | 'valuations' | 'analytics',
    format: 'csv' | 'excel' | 'pdf'
  ): Promise<Blob> {
    const response = await adminClient.get(`/reports/export`, {
      params: { type, format },
      responseType: 'blob',
    });
    return response.data;
  },

  // System Management
  async getSystemHealth(): Promise<{
    status: string;
    services: Record<string, string>;
    metrics: Record<string, number>;
  }> {
    const response = await adminClient.get('/system/health');
    return response.data;
  },

  async getAuditLogs(
    page: number = 1,
    limit: number = 10,
    userId?: string,
    action?: string
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(userId && { user_id: userId }),
      ...(action && { action }),
    });
    
    const response = await adminClient.get(`/audit-logs?${params}`);
    return response.data;
  },
};

// Request interceptor to add auth token
adminClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
adminClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      // Forbidden - redirect to unauthorized page
      if (typeof window !== 'undefined') {
        window.location.href = '/unauthorized';
      }
    }
    return Promise.reject(error);
  }
);

export default adminClient;