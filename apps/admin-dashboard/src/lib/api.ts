import { 
  DashboardMetrics, 
  Transaction, 
  MSMEListing, 
  ChartData, 
  SystemAlert, 
  SystemMetrics,
  ApiResponse,
  TableFilters,
  PaginationParams 
} from '@/types/dashboard'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    }

    try {
      const response = await fetch(url, { ...defaultOptions, ...options })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return {
        data: data.data || data,
        success: true,
        message: data.message,
        pagination: data.pagination,
      }
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error)
      throw error
    }
  }

  private getAuthToken(): string {
    // In a real app, this would get the token from localStorage, cookies, etc.
    return typeof window !== 'undefined' 
      ? localStorage.getItem('admin_token') || ''
      : ''
  }

  // Dashboard Metrics
  async getDashboardMetrics(dateFilter?: string): Promise<ApiResponse<DashboardMetrics>> {
    const params = dateFilter ? `?filter=${dateFilter}` : ''
    return this.request<DashboardMetrics>(`/admin/metrics${params}`)
  }

  // Transactions
  async getTransactions(
    filters?: TableFilters,
    pagination?: Pick<PaginationParams, 'page' | 'pageSize'>
  ): Promise<ApiResponse<Transaction[]>> {
    const searchParams = new URLSearchParams()
    
    if (filters?.search) searchParams.set('search', filters.search)
    if (filters?.region) searchParams.set('region', filters.region)
    if (filters?.status) searchParams.set('status', filters.status)
    if (filters?.sortBy) searchParams.set('sortBy', filters.sortBy)
    if (filters?.sortOrder) searchParams.set('sortOrder', filters.sortOrder)
    if (pagination?.page) searchParams.set('page', pagination.page.toString())
    if (pagination?.pageSize) searchParams.set('pageSize', pagination.pageSize.toString())

    const queryString = searchParams.toString()
    return this.request<Transaction[]>(`/admin/transactions${queryString ? `?${queryString}` : ''}`)
  }

  // MSME Listings
  async getMSMEListings(
    filters?: TableFilters,
    pagination?: Pick<PaginationParams, 'page' | 'pageSize'>
  ): Promise<ApiResponse<MSMEListing[]>> {
    const searchParams = new URLSearchParams()
    
    if (filters?.search) searchParams.set('search', filters.search)
    if (filters?.region) searchParams.set('region', filters.region)
    if (filters?.status) searchParams.set('status', filters.status)
    if (pagination?.page) searchParams.set('page', pagination.page.toString())
    if (pagination?.pageSize) searchParams.set('pageSize', pagination.pageSize.toString())

    const queryString = searchParams.toString()
    return this.request<MSMEListing[]>(`/admin/msmes${queryString ? `?${queryString}` : ''}`)
  }

  // Chart Data
  async getChartData(dateFilter?: string): Promise<ApiResponse<ChartData>> {
    const params = dateFilter ? `?filter=${dateFilter}` : ''
    return this.request<ChartData>(`/admin/charts${params}`)
  }

  // System Alerts
  async getSystemAlerts(unreadOnly?: boolean): Promise<ApiResponse<SystemAlert[]>> {
    const params = unreadOnly ? '?unread=true' : ''
    return this.request<SystemAlert[]>(`/admin/alerts${params}`)
  }

  async markAlertAsRead(alertId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/alerts/${alertId}/read`, {
      method: 'PATCH',
    })
  }

  async dismissAlert(alertId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/alerts/${alertId}`, {
      method: 'DELETE',
    })
  }

  // Prometheus/System Metrics
  async getSystemMetrics(): Promise<ApiResponse<SystemMetrics>> {
    return this.request<SystemMetrics>('/admin/system-metrics')
  }

  async getPrometheusQuery(query: string, timeRange?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({ query })
    if (timeRange) params.set('range', timeRange)
    
    return this.request<any>(`/prometheus/api/v1/query?${params.toString()}`)
  }

  // Export functionality
  async exportTransactions(
    format: 'csv' | 'xlsx',
    filters?: TableFilters
  ): Promise<Blob> {
    const searchParams = new URLSearchParams({ format })
    
    if (filters?.search) searchParams.set('search', filters.search)
    if (filters?.region) searchParams.set('region', filters.region)
    if (filters?.status) searchParams.set('status', filters.status)

    const response = await fetch(
      `${API_BASE_URL}/admin/transactions/export?${searchParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Export failed')
    }

    return response.blob()
  }

  async exportMSMEs(
    format: 'csv' | 'xlsx',
    filters?: TableFilters
  ): Promise<Blob> {
    const searchParams = new URLSearchParams({ format })
    
    if (filters?.search) searchParams.set('search', filters.search)
    if (filters?.region) searchParams.set('region', filters.region)
    if (filters?.status) searchParams.set('status', filters.status)

    const response = await fetch(
      `${API_BASE_URL}/admin/msmes/export?${searchParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Export failed')
    }

    return response.blob()
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('/health')
  }
}

export const apiClient = new ApiClient()

// Mock data for development
export const mockApiClient = {
  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
    
    return {
      data: {
        totalActiveMSMEs: 15420,
        newSignupsToday: 87,
        totalTransactions: 2340,
        pendingApprovals: 156,
        conversionRate: 68.5,
        successfulTransactions: 2184,
        activeBuyers: 890,
        activeSellers: 1205,
        avgDealSize: 2750000,
      },
      success: true,
    }
  },

  async getTransactions(): Promise<ApiResponse<Transaction[]>> {
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const mockTransactions: Transaction[] = Array.from({ length: 20 }, (_, i) => ({
      id: `txn_${i + 1}`,
      msme: {
        id: `msme_${i + 1}`,
        name: `Business Owner ${i + 1}`,
        businessName: `MSME Business ${i + 1}`,
      },
      dealStatus: ['pending', 'approved', 'completed', 'rejected'][Math.floor(Math.random() * 4)] as any,
      amount: Math.floor(Math.random() * 5000000) + 500000,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      region: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'][Math.floor(Math.random() * 5)],
      agentName: `Agent ${i + 1}`,
      type: ['loan', 'investment', 'grant', 'valuation'][Math.floor(Math.random() * 4)] as any,
    }))

    return {
      data: mockTransactions,
      success: true,
      pagination: {
        page: 1,
        pageSize: 20,
        total: 156,
      },
    }
  },

  async getMSMEListings(): Promise<ApiResponse<MSMEListing[]>> {
    await new Promise(resolve => setTimeout(resolve, 600))
    
    const mockMSMEs: MSMEListing[] = Array.from({ length: 15 }, (_, i) => ({
      id: `msme_${i + 1}`,
      businessName: `Business Enterprise ${i + 1}`,
      ownerName: `Owner Name ${i + 1}`,
      signupDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      complianceStatus: ['compliant', 'pending', 'non-compliant'][Math.floor(Math.random() * 3)] as any,
      valuationScore: Math.floor(Math.random() * 100) + 1,
      region: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'][Math.floor(Math.random() * 5)],
      onboardingStep: ['registration', 'kyc', 'documentation', 'verification', 'completed'][Math.floor(Math.random() * 5)] as any,
      lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }))

    return {
      data: mockMSMEs,
      success: true,
      pagination: {
        page: 1,
        pageSize: 15,
        total: 15420,
      },
    }
  },

  async getChartData(): Promise<ApiResponse<ChartData>> {
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    return {
      data: {
        weeklySignups: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          signups: Math.floor(Math.random() * 50) + 10,
        })),
        valuationTrends: Array.from({ length: 12 }, (_, i) => ({
          date: new Date(2024, i, 1).toISOString().split('T')[0],
          avgValuation: Math.floor(Math.random() * 2000000) + 1000000,
          count: Math.floor(Math.random() * 200) + 50,
        })),
        regionDistribution: [
          { region: 'Mumbai', count: 4200, percentage: 28.5 },
          { region: 'Delhi', count: 3800, percentage: 25.8 },
          { region: 'Bangalore', count: 3200, percentage: 21.7 },
          { region: 'Chennai', count: 2100, percentage: 14.2 },
          { region: 'Others', count: 1420, percentage: 9.8 },
        ],
        sectorDeals: Array.from({ length: 6 }, (_, i) => ({
          sector: ['Manufacturing', 'Services', 'Retail', 'Agriculture', 'Technology', 'Healthcare'][i],
          activeDeals: Math.floor(Math.random() * 100) + 20,
          completedDeals: Math.floor(Math.random() * 200) + 50,
          month: new Date(2024, i % 12, 1).toISOString().split('T')[0],
        })),
      },
      success: true,
    }
  },

  async getSystemAlerts(): Promise<ApiResponse<SystemAlert[]>> {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const mockAlerts: SystemAlert[] = [
      {
        id: 'alert_1',
        type: 'new_signup',
        title: 'New MSME Registration',
        message: '5 new MSMEs registered in the last hour',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        severity: 'low',
        isRead: false,
        relatedEntity: { type: 'msme', id: 'msme_new', name: 'Latest MSME' },
      },
      {
        id: 'alert_2',
        type: 'api_health',
        title: 'High API Latency',
        message: 'Valuation API response time increased to 2.5s',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        severity: 'medium',
        isRead: false,
        actionRequired: true,
      },
      {
        id: 'alert_3',
        type: 'incomplete_kyc',
        title: 'Pending KYC Verifications',
        message: '23 MSMEs have incomplete KYC documentation',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        severity: 'high',
        isRead: true,
      },
    ]

    return {
      data: mockAlerts,
      success: true,
    }
  },

  async getSystemMetrics(): Promise<ApiResponse<SystemMetrics>> {
    await new Promise(resolve => setTimeout(resolve, 800))
    
    return {
      data: {
        uptime: {
          percentage: 99.7,
          duration: '29d 14h 23m',
        },
        requestLatency: {
          avg: 245,
          p95: 890,
          p99: 1250,
        },
        redisStats: {
          hitRate: 94.2,
          missRate: 5.8,
          totalKeys: 15420,
        },
        errorRates: [
          { endpoint: '/api/auth/login', errorRate: 0.2, totalRequests: 5420 },
          { endpoint: '/api/msme/create', errorRate: 1.1, totalRequests: 890 },
          { endpoint: '/api/valuation/calculate', errorRate: 2.3, totalRequests: 1200 },
        ],
        resourceUsage: {
          cpuUsage: 45.2,
          memoryUsage: 67.8,
          diskUsage: 23.4,
        },
      },
      success: true,
    }
  },
}

// Use mock data in development
export const api = process.env.NODE_ENV === 'development' ? mockApiClient : apiClient