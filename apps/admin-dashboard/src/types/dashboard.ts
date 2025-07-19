export interface DashboardMetrics {
  totalActiveMSMEs: number
  newSignupsToday: number
  totalTransactions: number
  pendingApprovals: number
  conversionRate: number
  successfulTransactions: number
  activeBuyers: number
  activeSellers: number
  avgDealSize: number
}

export interface Transaction {
  id: string
  msme: {
    id: string
    name: string
    businessName: string
  }
  dealStatus: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
  amount: number
  date: string
  region: string
  agentName: string
  type: 'loan' | 'investment' | 'grant' | 'valuation'
}

export interface MSMEListing {
  id: string
  businessName: string
  ownerName: string
  signupDate: string
  complianceStatus: 'compliant' | 'pending' | 'non-compliant'
  valuationScore: number
  region: string
  onboardingStep: 'registration' | 'kyc' | 'documentation' | 'verification' | 'completed'
  lastActivity: string
}

export interface ChartData {
  weeklySignups: Array<{
    date: string
    signups: number
    previousWeek?: number
  }>
  valuationTrends: Array<{
    date: string
    avgValuation: number
    count: number
  }>
  regionDistribution: Array<{
    region: string
    count: number
    percentage: number
  }>
  sectorDeals: Array<{
    sector: string
    activeDeals: number
    completedDeals: number
    month: string
  }>
}

export interface SystemAlert {
  id: string
  type: 'new_signup' | 'low_wallet' | 'incomplete_kyc' | 'api_health' | 'system_error'
  title: string
  message: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  isRead: boolean
  actionRequired?: boolean
  relatedEntity?: {
    type: 'msme' | 'transaction' | 'user'
    id: string
    name: string
  }
}

export interface PrometheusMetric {
  name: string
  value: number
  timestamp: number
  labels?: Record<string, string>
}

export interface SystemMetrics {
  uptime: {
    percentage: number
    duration: string
  }
  requestLatency: {
    avg: number
    p95: number
    p99: number
  }
  redisStats: {
    hitRate: number
    missRate: number
    totalKeys: number
  }
  errorRates: Array<{
    endpoint: string
    errorRate: number
    totalRequests: number
  }>
  resourceUsage: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
  }
}

export interface DateFilter {
  label: string
  value: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  startDate?: Date
  endDate?: Date
}

export interface TableFilters {
  search?: string
  region?: string
  status?: string
  dateRange?: {
    start: Date
    end: Date
  }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationParams {
  page: number
  pageSize: number
  total: number
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  pagination?: PaginationParams
}

export interface CSVExportOptions {
  filename: string
  fields: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  filters?: Record<string, any>
}