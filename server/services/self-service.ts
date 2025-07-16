// Self-service tools for agents, NBFCs, and automated MSME processing
import { queueManager } from '../infrastructure/queue-system';
import { storage } from '../storage';

interface AgentDashboard {
  agentId: string;
  earnings: {
    totalEarnings: number;
    monthlyEarnings: number;
    pendingPayouts: number;
    lastPayoutDate: string;
  };
  performance: {
    totalClients: number;
    activeDeals: number;
    completedDeals: number;
    conversionRate: number;
  };
  clients: AgentClient[];
  payouts: PayoutRecord[];
}

interface AgentClient {
  id: string;
  name: string;
  type: 'buyer' | 'seller';
  status: 'active' | 'inactive' | 'pending';
  potentialValue: number;
  lastActivity: string;
}

interface PayoutRecord {
  id: string;
  amount: number;
  date: string;
  status: 'pending' | 'processed' | 'failed';
  transactionId?: string;
}

interface NBFCDashboard {
  nbfcId: string;
  loanProducts: LoanProduct[];
  applications: LoanApplication[];
  pipeline: {
    totalApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    pendingApplications: number;
    totalDisbursed: number;
  };
  compliance: ComplianceStatus;
}

interface LoanProduct {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  tenure: number;
  eligibilityCriteria: string[];
  requiredDocuments: string[];
  processingTime: string;
  status: 'active' | 'inactive';
}

interface LoanApplication {
  id: string;
  businessId: string;
  businessName: string;
  requestedAmount: number;
  productId: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  submittedDate: string;
  riskScore: number;
  documents: ApplicationDocument[];
}

interface ApplicationDocument {
  id: string;
  type: string;
  filename: string;
  uploadDate: string;
  verified: boolean;
}

interface ComplianceStatus {
  rbiCompliance: boolean;
  lastAuditDate: string;
  pendingRequirements: string[];
  certifications: string[];
  riskRating: 'low' | 'medium' | 'high';
}

class SelfServiceManager {
  // Agent self-service functions
  async getAgentDashboard(agentId: string): Promise<AgentDashboard> {
    // Load agent data
    const agent = await storage.getAgentById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Calculate earnings
    const earnings = await this.calculateAgentEarnings(agentId);
    
    // Get performance metrics
    const performance = await this.getAgentPerformance(agentId);
    
    // Get clients
    const clients = await this.getAgentClients(agentId);
    
    // Get payout history
    const payouts = await this.getPayoutHistory(agentId);

    return {
      agentId,
      earnings,
      performance,
      clients,
      payouts,
    };
  }

  private async calculateAgentEarnings(agentId: string) {
    // Mock calculation - in real implementation, query transactions
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    return {
      totalEarnings: 125000,
      monthlyEarnings: 35000,
      pendingPayouts: 8500,
      lastPayoutDate: '2024-01-15',
    };
  }

  private async getAgentPerformance(agentId: string) {
    // Mock performance data
    return {
      totalClients: 45,
      activeDeals: 8,
      completedDeals: 23,
      conversionRate: 68.5,
    };
  }

  private async getAgentClients(agentId: string): Promise<AgentClient[]> {
    // Mock client data
    return [
      {
        id: '1',
        name: 'TechStart Solutions',
        type: 'seller',
        status: 'active',
        potentialValue: 2500000,
        lastActivity: '2024-01-20',
      },
      {
        id: '2',
        name: 'Investment Group A',
        type: 'buyer',
        status: 'active',
        potentialValue: 5000000,
        lastActivity: '2024-01-18',
      },
    ];
  }

  private async getPayoutHistory(agentId: string): Promise<PayoutRecord[]> {
    // Mock payout history
    return [
      {
        id: '1',
        amount: 25000,
        date: '2024-01-15',
        status: 'processed',
        transactionId: 'TXN123456',
      },
      {
        id: '2',
        amount: 8500,
        date: '2024-01-20',
        status: 'pending',
      },
    ];
  }

  async requestAgentPayout(agentId: string, amount: number, paymentMethod: string): Promise<any> {
    // Validate payout request
    const dashboard = await this.getAgentDashboard(agentId);
    
    if (amount > dashboard.earnings.pendingPayouts) {
      throw new Error('Insufficient payout balance');
    }

    // Add payout request to queue
    const payoutRequest = {
      agentId,
      amount,
      paymentMethod,
      requestDate: new Date().toISOString(),
    };

    await queueManager.addNotification(agentId, 'payout_request', payoutRequest);

    return {
      success: true,
      message: 'Payout request submitted successfully',
      estimatedProcessingTime: '1-2 business days',
    };
  }

  // NBFC self-service functions
  async getNBFCDashboard(nbfcId: string): Promise<NBFCDashboard> {
    const nbfc = await storage.getNBFCById(nbfcId);
    if (!nbfc) {
      throw new Error('NBFC not found');
    }

    const loanProducts = await this.getLoanProducts(nbfcId);
    const applications = await this.getLoanApplications(nbfcId);
    const pipeline = await this.calculatePipeline(nbfcId);
    const compliance = await this.getComplianceStatus(nbfcId);

    return {
      nbfcId,
      loanProducts,
      applications,
      pipeline,
      compliance,
    };
  }

  private async getLoanProducts(nbfcId: string): Promise<LoanProduct[]> {
    // Mock loan products
    return [
      {
        id: '1',
        name: 'MSME Business Loan',
        minAmount: 100000,
        maxAmount: 10000000,
        interestRate: 12.5,
        tenure: 36,
        eligibilityCriteria: [
          'Business operational for minimum 2 years',
          'Annual turnover minimum ₹5 lakhs',
          'Good credit score (>650)',
        ],
        requiredDocuments: [
          'Business registration certificate',
          'Financial statements (last 2 years)',
          'Bank statements (last 6 months)',
          'GST returns',
        ],
        processingTime: '5-7 business days',
        status: 'active',
      },
      {
        id: '2',
        name: 'Quick Cash Loan',
        minAmount: 50000,
        maxAmount: 2000000,
        interestRate: 15.0,
        tenure: 12,
        eligibilityCriteria: [
          'Business operational for minimum 1 year',
          'Monthly revenue minimum ₹50,000',
        ],
        requiredDocuments: [
          'Business registration',
          'Bank statements (last 3 months)',
        ],
        processingTime: '24-48 hours',
        status: 'active',
      },
    ];
  }

  private async getLoanApplications(nbfcId: string): Promise<LoanApplication[]> {
    // Mock loan applications
    return [
      {
        id: '1',
        businessId: 'biz-123',
        businessName: 'TechStart Solutions',
        requestedAmount: 2500000,
        productId: '1',
        status: 'pending',
        submittedDate: '2024-01-18',
        riskScore: 75,
        documents: [
          {
            id: '1',
            type: 'financial_statement',
            filename: 'financial_2023.pdf',
            uploadDate: '2024-01-18',
            verified: true,
          },
          {
            id: '2',
            type: 'bank_statement',
            filename: 'bank_statements.pdf',
            uploadDate: '2024-01-18',
            verified: false,
          },
        ],
      },
    ];
  }

  private async calculatePipeline(nbfcId: string) {
    // Mock pipeline calculation
    return {
      totalApplications: 45,
      approvedApplications: 32,
      rejectedApplications: 8,
      pendingApplications: 5,
      totalDisbursed: 85000000,
    };
  }

  private async getComplianceStatus(nbfcId: string): Promise<ComplianceStatus> {
    // Mock compliance status
    return {
      rbiCompliance: true,
      lastAuditDate: '2023-12-15',
      pendingRequirements: [],
      certifications: ['RBI Certificate', 'ISO 27001'],
      riskRating: 'low',
    };
  }

  async uploadLoanProduct(nbfcId: string, productData: Omit<LoanProduct, 'id'>): Promise<any> {
    // Validate NBFC permissions
    const nbfc = await storage.getNBFCById(nbfcId);
    if (!nbfc) {
      throw new Error('NBFC not found');
    }

    // Validate product data
    if (!productData.name || productData.minAmount <= 0 || productData.maxAmount <= productData.minAmount) {
      throw new Error('Invalid product data');
    }

    // Generate product ID
    const productId = `prod_${Date.now()}`;

    const loanProduct: LoanProduct = {
      ...productData,
      id: productId,
      status: 'active',
    };

    // Add to queue for processing
    await queueManager.addNotification(nbfcId, 'loan_product_upload', loanProduct);

    return {
      success: true,
      productId,
      message: 'Loan product uploaded successfully',
    };
  }

  async processLoanApplication(nbfcId: string, applicationId: string, decision: 'approve' | 'reject', comments?: string): Promise<any> {
    // Validate application
    const applications = await this.getLoanApplications(nbfcId);
    const application = applications.find(app => app.id === applicationId);
    
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'pending') {
      throw new Error('Application already processed');
    }

    // Process decision
    const processedApplication = {
      ...application,
      status: decision === 'approve' ? 'approved' : 'rejected',
      processedDate: new Date().toISOString(),
      comments,
    };

    // Add to queue for processing
    await queueManager.addNotification(nbfcId, 'loan_application_decision', processedApplication);

    // Notify applicant
    await queueManager.addNotification(application.businessId, 'loan_decision_notification', {
      applicationId,
      decision,
      comments,
    });

    return {
      success: true,
      message: `Application ${decision}d successfully`,
      nextSteps: decision === 'approve' ? 'Disbursement will be processed within 24 hours' : 'Applicant will be notified',
    };
  }

  // MSME auto-approval system
  async autoProcessMSMEListing(listingData: any): Promise<any> {
    // Automated validation checks
    const validationResults = await this.validateMSMEListing(listingData);
    
    if (validationResults.autoApprove) {
      // Auto-approve and publish
      await this.autoApproveListing(listingData);
      return {
        status: 'auto_approved',
        message: 'Listing automatically approved and published',
        validationScore: validationResults.score,
      };
    } else if (validationResults.requiresReview) {
      // Queue for manual review
      await queueManager.addNotification('admin', 'manual_review_required', {
        listingId: listingData.id,
        issues: validationResults.issues,
      });
      
      return {
        status: 'pending_review',
        message: 'Listing queued for manual review',
        validationScore: validationResults.score,
        issues: validationResults.issues,
      };
    } else {
      // Auto-reject
      return {
        status: 'rejected',
        message: 'Listing does not meet minimum requirements',
        validationScore: validationResults.score,
        issues: validationResults.issues,
      };
    }
  }

  private async validateMSMEListing(listingData: any) {
    let score = 0;
    const issues: string[] = [];

    // Basic information validation
    if (listingData.businessName && listingData.businessName.length > 3) {
      score += 10;
    } else {
      issues.push('Business name too short or missing');
    }

    // Financial information
    if (listingData.revenue > 0) {
      score += 20;
    } else {
      issues.push('Revenue information missing or invalid');
    }

    if (listingData.profit && listingData.profit > 0) {
      score += 15;
    } else {
      issues.push('Profit information missing or invalid');
    }

    // Business age
    if (listingData.yearEstablished && (new Date().getFullYear() - listingData.yearEstablished) >= 2) {
      score += 15;
    } else {
      issues.push('Business must be operational for at least 2 years');
    }

    // Industry classification
    if (listingData.industry && listingData.industry !== 'general') {
      score += 10;
    } else {
      issues.push('Specific industry classification required');
    }

    // Location
    if (listingData.location && listingData.location !== 'unknown') {
      score += 10;
    } else {
      issues.push('Valid location required');
    }

    // Documents
    if (listingData.documents && listingData.documents.length >= 3) {
      score += 20;
    } else {
      issues.push('Minimum 3 documents required');
    }

    return {
      score,
      issues,
      autoApprove: score >= 80 && issues.length === 0,
      requiresReview: score >= 60 && issues.length <= 2,
    };
  }

  private async autoApproveListing(listingData: any) {
    // Auto-approve and publish listing
    const approvedListing = {
      ...listingData,
      status: 'approved',
      approvedDate: new Date().toISOString(),
      approvedBy: 'system',
    };

    // Add to queue for processing
    await queueManager.addNotification('system', 'auto_approve_listing', approvedListing);

    // Notify seller
    await queueManager.addNotification(listingData.sellerId, 'listing_approved', {
      listingId: listingData.id,
      message: 'Your business listing has been approved and is now live',
    });
  }

  // Analytics for self-service tools
  async getAgentAnalytics(agentId: string, period: string = '30d') {
    return {
      period,
      metrics: {
        totalEarnings: 125000,
        newClients: 8,
        conversionRate: 68.5,
        avgDealValue: 2500000,
      },
      trends: {
        earningsGrowth: 15.2,
        clientGrowth: 12.8,
        conversionImprovement: 5.3,
      },
      topPerformingCategories: [
        { category: 'Technology', deals: 12, earnings: 45000 },
        { category: 'Manufacturing', deals: 8, earnings: 35000 },
        { category: 'Services', deals: 6, earnings: 25000 },
      ],
    };
  }

  async getNBFCAnalytics(nbfcId: string, period: string = '30d') {
    return {
      period,
      metrics: {
        totalApplications: 45,
        approvalRate: 71.1,
        avgProcessingTime: 4.2,
        totalDisbursed: 85000000,
      },
      trends: {
        applicationGrowth: 22.5,
        approvalRateChange: -2.1,
        processingTimeImprovement: 15.8,
      },
      riskAnalysis: {
        lowRisk: 32,
        mediumRisk: 8,
        highRisk: 5,
      },
    };
  }
}

export const selfServiceManager = new SelfServiceManager();
export { AgentDashboard, NBFCDashboard, LoanProduct, LoanApplication };