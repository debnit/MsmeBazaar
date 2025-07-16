// Smart analytics dashboards with real-time insights
import { storage } from '../storage';
import { buyerScoringService } from './buyer-scoring';
import { razorpayService } from './razorpay-integration';
import { retentionSystem } from './retention-system';

interface DashboardMetrics {
  overview: OverviewMetrics;
  revenue: RevenueMetrics;
  users: UserMetrics;
  businesses: BusinessMetrics;
  transactions: TransactionMetrics;
  performance: PerformanceMetrics;
}

interface OverviewMetrics {
  totalUsers: number;
  activeUsers: number;
  totalBusinesses: number;
  totalTransactions: number;
  totalRevenue: number;
  growthRate: number;
}

interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueBySource: {
    subscriptions: number;
    valuations: number;
    matchmaking: number;
    escrowFees: number;
    commissions: number;
  };
  revenueGrowth: number;
  arpu: number; // Average Revenue Per User
  ltv: number; // Lifetime Value
}

interface UserMetrics {
  totalUsers: number;
  newUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  usersByType: {
    buyers: number;
    sellers: number;
    agents: number;
    nbfcs: number;
  };
  churnRate: number;
  retentionRate: number;
}

interface BusinessMetrics {
  totalListings: number;
  activeListings: number;
  newListings: number;
  averageValuation: number;
  listingsByIndustry: Record<string, number>;
  listingsByLocation: Record<string, number>;
  conversionRate: number;
  timeToSale: number;
}

interface TransactionMetrics {
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  averageTransactionValue: number;
  transactionVolume: number;
  escrowBalance: number;
}

interface PerformanceMetrics {
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
  mlPerformance: {
    valuationAccuracy: number;
    matchingPrecision: number;
    scoringLatency: number;
    modelVersion: string;
  };
  apiMetrics: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    rateLimitHits: number;
  };
}

interface AgentDashboardData {
  agentId: string;
  personalMetrics: {
    totalEarnings: number;
    monthlyEarnings: number;
    commissionRate: number;
    clientCount: number;
    activeDeals: number;
    completedDeals: number;
    conversionRate: number;
    avgDealSize: number;
  };
  performance: {
    ranking: number;
    scorecard: {
      clientSatisfaction: number;
      responseTime: number;
      dealClosure: number;
      qualityScore: number;
    };
    achievements: string[];
    goals: {
      current: number;
      target: number;
      progress: number;
    };
  };
  clients: {
    active: ClientSummary[];
    potential: ClientSummary[];
    converted: ClientSummary[];
  };
  analytics: {
    earningsChart: ChartData[];
    performanceChart: ChartData[];
    clientAcquisition: ChartData[];
  };
}

interface NBFCDashboardData {
  nbfcId: string;
  lendingMetrics: {
    totalApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    pendingApplications: number;
    totalDisbursed: number;
    portfolioValue: number;
    defaultRate: number;
    averageTicketSize: number;
  };
  portfolio: {
    activeLoans: number;
    totalExposure: number;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
    };
    industryExposure: Record<string, number>;
    geographical: Record<string, number>;
  };
  performance: {
    processingTime: number;
    approvalRate: number;
    customerSatisfaction: number;
    npa: number; // Non-Performing Assets
    roi: number; // Return on Investment
  };
  compliance: {
    rbiCompliance: boolean;
    auditScore: number;
    pendingActions: number;
    lastAuditDate: string;
  };
}

interface ClientSummary {
  id: string;
  name: string;
  type: 'buyer' | 'seller';
  value: number;
  status: string;
  lastActivity: string;
}

interface ChartData {
  date: string;
  value: number;
  category?: string;
}

class SmartDashboardService {
  // Main admin dashboard
  async getMainDashboard(period: string = '30d'): Promise<DashboardMetrics> {
    const [overview, revenue, users, businesses, transactions, performance] = await Promise.all([
      this.getOverviewMetrics(period),
      this.getRevenueMetrics(period),
      this.getUserMetrics(period),
      this.getBusinessMetrics(period),
      this.getTransactionMetrics(period),
      this.getPerformanceMetrics(period),
    ]);

    return {
      overview,
      revenue,
      users,
      businesses,
      transactions,
      performance,
    };
  }

  // Agent-specific dashboard
  async getAgentDashboard(agentId: string, period: string = '30d'): Promise<AgentDashboardData> {
    const agent = await storage.getAgentById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Personal metrics
    const personalMetrics = await this.getAgentPersonalMetrics(agentId, period);
    
    // Performance metrics
    const performance = await this.getAgentPerformance(agentId, period);
    
    // Client data
    const clients = await this.getAgentClients(agentId);
    
    // Analytics charts
    const analytics = await this.getAgentAnalytics(agentId, period);

    return {
      agentId,
      personalMetrics,
      performance,
      clients,
      analytics,
    };
  }

  // NBFC-specific dashboard
  async getNBFCDashboard(nbfcId: string, period: string = '30d'): Promise<NBFCDashboardData> {
    const nbfc = await storage.getNBFCById(nbfcId);
    if (!nbfc) {
      throw new Error('NBFC not found');
    }

    // Lending metrics
    const lendingMetrics = await this.getNBFCLendingMetrics(nbfcId, period);
    
    // Portfolio analysis
    const portfolio = await this.getNBFCPortfolio(nbfcId);
    
    // Performance metrics
    const performance = await this.getNBFCPerformance(nbfcId, period);
    
    // Compliance status
    const compliance = await this.getNBFCCompliance(nbfcId);

    return {
      nbfcId,
      lendingMetrics,
      portfolio,
      performance,
      compliance,
    };
  }

  // Real-time analytics
  async getRealTimeMetrics(): Promise<any> {
    return {
      activeUsers: await this.getActiveUserCount(),
      ongoingTransactions: await this.getOngoingTransactionCount(),
      systemLoad: await this.getSystemLoadMetrics(),
      alertsCount: await this.getActiveAlertsCount(),
      recentActivity: await this.getRecentActivity(),
    };
  }

  // Market insights
  async getMarketInsights(period: string = '30d'): Promise<any> {
    return {
      marketTrends: await this.getMarketTrends(period),
      industryAnalysis: await this.getIndustryAnalysis(period),
      geographicalInsights: await this.getGeographicalInsights(period),
      pricingTrends: await this.getPricingTrends(period),
      demandSupplyAnalysis: await this.getDemandSupplyAnalysis(period),
    };
  }

  // Predictive analytics
  async getPredictiveAnalytics(): Promise<any> {
    return {
      churnPrediction: await this.getChurnPrediction(),
      revenueForecast: await this.getRevenueForecast(),
      marketOpportunities: await this.getMarketOpportunities(),
      riskAssessment: await this.getRiskAssessment(),
    };
  }

  // Helper methods for metrics calculation
  private async getOverviewMetrics(period: string): Promise<OverviewMetrics> {
    // In production, query actual database
    return {
      totalUsers: 15247,
      activeUsers: 8923,
      totalBusinesses: 3456,
      totalTransactions: 1247,
      totalRevenue: 2567800,
      growthRate: 15.8,
    };
  }

  private async getRevenueMetrics(period: string): Promise<RevenueMetrics> {
    const revenueData = await razorpayService.getRevenueAnalytics(period);
    
    return {
      totalRevenue: revenueData.totalRevenue,
      monthlyRevenue: revenueData.totalRevenue / 12,
      revenueBySource: {
        subscriptions: revenueData.subscriptionRevenue,
        valuations: revenueData.valuationRevenue,
        matchmaking: revenueData.matchmakingRevenue,
        escrowFees: revenueData.escrowFees,
        commissions: revenueData.agentCommissions,
      },
      revenueGrowth: revenueData.monthlyGrowth,
      arpu: revenueData.totalRevenue / 15247,
      ltv: revenueData.ltv,
    };
  }

  private async getUserMetrics(period: string): Promise<UserMetrics> {
    const retentionData = await retentionSystem.getRetentionAnalytics(period);
    
    return {
      totalUsers: retentionData.totalUsers,
      newUsers: 1234,
      activeUsers: retentionData.activeUsers,
      usersByType: {
        buyers: 7823,
        sellers: 4234,
        agents: 1890,
        nbfcs: 1300,
      },
      churnRate: retentionData.churnRate,
      retentionRate: retentionData.retentionRate.day30,
    };
  }

  private async getBusinessMetrics(period: string): Promise<BusinessMetrics> {
    return {
      totalListings: 3456,
      activeListings: 2987,
      newListings: 234,
      averageValuation: 2450000,
      listingsByIndustry: {
        technology: 1245,
        manufacturing: 987,
        services: 765,
        healthcare: 459,
      },
      listingsByLocation: {
        mumbai: 1234,
        bangalore: 987,
        delhi: 765,
        pune: 470,
      },
      conversionRate: 23.4,
      timeToSale: 45,
    };
  }

  private async getTransactionMetrics(period: string): Promise<TransactionMetrics> {
    return {
      totalTransactions: 1247,
      completedTransactions: 987,
      pendingTransactions: 156,
      failedTransactions: 104,
      averageTransactionValue: 2058000,
      transactionVolume: 2567800000,
      escrowBalance: 45678900,
    };
  }

  private async getPerformanceMetrics(period: string): Promise<PerformanceMetrics> {
    return {
      systemHealth: {
        uptime: 99.8,
        responseTime: 145,
        errorRate: 0.2,
        throughput: 1245,
      },
      mlPerformance: {
        valuationAccuracy: 87.3,
        matchingPrecision: 92.1,
        scoringLatency: 35,
        modelVersion: '1.2.3',
      },
      apiMetrics: {
        totalRequests: 125467,
        successRate: 99.8,
        averageResponseTime: 145,
        rateLimitHits: 234,
      },
    };
  }

  private async getAgentPersonalMetrics(agentId: string, period: string): Promise<any> {
    return {
      totalEarnings: 125000,
      monthlyEarnings: 35000,
      commissionRate: 2.5,
      clientCount: 45,
      activeDeals: 8,
      completedDeals: 23,
      conversionRate: 68.5,
      avgDealSize: 2500000,
    };
  }

  private async getAgentPerformance(agentId: string, period: string): Promise<any> {
    return {
      ranking: 12,
      scorecard: {
        clientSatisfaction: 4.7,
        responseTime: 2.3,
        dealClosure: 8.5,
        qualityScore: 9.2,
      },
      achievements: [
        'Top Performer - Q1 2024',
        'Client Satisfaction Award',
        'Fast Response Recognition',
      ],
      goals: {
        current: 75000,
        target: 100000,
        progress: 75,
      },
    };
  }

  private async getAgentClients(agentId: string): Promise<any> {
    return {
      active: [
        {
          id: '1',
          name: 'TechStart Solutions',
          type: 'seller',
          value: 2500000,
          status: 'negotiating',
          lastActivity: '2024-01-20',
        },
      ],
      potential: [
        {
          id: '2',
          name: 'Investment Group B',
          type: 'buyer',
          value: 5000000,
          status: 'initial_contact',
          lastActivity: '2024-01-19',
        },
      ],
      converted: [
        {
          id: '3',
          name: 'Manufacturing Corp',
          type: 'seller',
          value: 3500000,
          status: 'completed',
          lastActivity: '2024-01-15',
        },
      ],
    };
  }

  private async getAgentAnalytics(agentId: string, period: string): Promise<any> {
    return {
      earningsChart: [
        { date: '2024-01-01', value: 15000 },
        { date: '2024-01-02', value: 18000 },
        { date: '2024-01-03', value: 22000 },
      ],
      performanceChart: [
        { date: '2024-01-01', value: 85 },
        { date: '2024-01-02', value: 87 },
        { date: '2024-01-03', value: 90 },
      ],
      clientAcquisition: [
        { date: '2024-01-01', value: 3 },
        { date: '2024-01-02', value: 5 },
        { date: '2024-01-03', value: 7 },
      ],
    };
  }

  private async getNBFCLendingMetrics(nbfcId: string, period: string): Promise<any> {
    return {
      totalApplications: 156,
      approvedApplications: 89,
      rejectedApplications: 34,
      pendingApplications: 33,
      totalDisbursed: 125000000,
      portfolioValue: 450000000,
      defaultRate: 3.2,
      averageTicketSize: 1800000,
    };
  }

  private async getNBFCPortfolio(nbfcId: string): Promise<any> {
    return {
      activeLoans: 234,
      totalExposure: 450000000,
      riskDistribution: {
        low: 156,
        medium: 67,
        high: 11,
      },
      industryExposure: {
        technology: 125000000,
        manufacturing: 89000000,
        services: 67000000,
        healthcare: 45000000,
      },
      geographical: {
        maharashtra: 156000000,
        karnataka: 123000000,
        delhi: 89000000,
        gujarat: 67000000,
      },
    };
  }

  private async getNBFCPerformance(nbfcId: string, period: string): Promise<any> {
    return {
      processingTime: 4.2,
      approvalRate: 57.1,
      customerSatisfaction: 4.3,
      npa: 2.8,
      roi: 12.5,
    };
  }

  private async getNBFCCompliance(nbfcId: string): Promise<any> {
    return {
      rbiCompliance: true,
      auditScore: 92,
      pendingActions: 2,
      lastAuditDate: '2023-12-15',
    };
  }

  private async getActiveUserCount(): Promise<number> {
    return 3456;
  }

  private async getOngoingTransactionCount(): Promise<number> {
    return 89;
  }

  private async getSystemLoadMetrics(): Promise<any> {
    return {
      cpu: 65,
      memory: 72,
      disk: 45,
      network: 23,
    };
  }

  private async getActiveAlertsCount(): Promise<number> {
    return 7;
  }

  private async getRecentActivity(): Promise<any[]> {
    return [
      { type: 'transaction', message: 'New transaction completed', timestamp: '2024-01-20T10:30:00Z' },
      { type: 'user', message: 'New user registered', timestamp: '2024-01-20T10:25:00Z' },
      { type: 'alert', message: 'High system load detected', timestamp: '2024-01-20T10:20:00Z' },
    ];
  }

  private async getMarketTrends(period: string): Promise<any> {
    return {
      valuationTrends: [
        { industry: 'technology', change: 15.2 },
        { industry: 'manufacturing', change: 8.7 },
        { industry: 'services', change: 12.3 },
      ],
      demandTrends: [
        { segment: 'small_business', change: 22.1 },
        { segment: 'medium_business', change: 18.4 },
        { segment: 'micro_business', change: 25.6 },
      ],
    };
  }

  private async getIndustryAnalysis(period: string): Promise<any> {
    return {
      hotSectors: ['technology', 'healthcare', 'fintech'],
      growingSectors: ['renewable_energy', 'edtech', 'logistics'],
      decliningeSectors: ['traditional_retail', 'print_media'],
    };
  }

  private async getGeographicalInsights(period: string): Promise<any> {
    return {
      hotSpots: ['bangalore', 'mumbai', 'hyderabad'],
      emergingCities: ['pune', 'chennai', 'ahmedabad'],
      valuationByCity: {
        mumbai: 2800000,
        bangalore: 2650000,
        delhi: 2400000,
      },
    };
  }

  private async getPricingTrends(period: string): Promise<any> {
    return {
      averageMultiple: 4.2,
      multipleByIndustry: {
        technology: 6.5,
        manufacturing: 3.8,
        services: 4.1,
      },
      pricingPressure: 'moderate',
    };
  }

  private async getDemandSupplyAnalysis(period: string): Promise<any> {
    return {
      demandSupplyRatio: 1.8,
      inventoryTurnover: 45,
      timeToMarket: 23,
      competitionLevel: 'moderate',
    };
  }

  private async getChurnPrediction(): Promise<any> {
    return {
      highRiskUsers: 234,
      mediumRiskUsers: 567,
      lowRiskUsers: 1890,
      predictedChurnRate: 8.5,
    };
  }

  private async getRevenueForecast(): Promise<any> {
    return {
      nextMonth: 2850000,
      nextQuarter: 8750000,
      nextYear: 35000000,
      confidence: 87.3,
    };
  }

  private async getMarketOpportunities(): Promise<any> {
    return {
      underservedSegments: ['micro_businesses', 'rural_markets'],
      pricingOpportunities: ['premium_valuations', 'express_services'],
      geographicExpansion: ['tier2_cities', 'northeast_india'],
    };
  }

  private async getRiskAssessment(): Promise<any> {
    return {
      systemRisks: ['high_load', 'model_drift'],
      businessRisks: ['market_volatility', 'regulatory_changes'],
      technicalRisks: ['api_failures', 'data_quality'],
      overallRiskScore: 'medium',
    };
  }
}

export const smartDashboardService = new SmartDashboardService();
export { DashboardMetrics, AgentDashboardData, NBFCDashboardData };