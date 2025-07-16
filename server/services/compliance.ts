import { storage } from '../storage';
import { auditLogger } from '../middleware/security';

// Compliance disclaimers and legal notices
export const COMPLIANCE_DISCLAIMERS = {
  ESCROW_TERMS: `
**ESCROW SERVICE TERMS AND CONDITIONS**

By using our escrow service, you acknowledge and agree to the following:

1. **Regulatory Compliance**: This service complies with RBI guidelines for digital payment intermediaries
2. **Fund Security**: Escrowed funds are held in FDIC-insured accounts with licensed banking partners
3. **Transaction Monitoring**: All transactions are monitored for AML/KYC compliance
4. **Dispute Resolution**: Disputes are handled through our certified mediation process
5. **Tax Implications**: Users are responsible for applicable taxes on transactions
6. **Data Protection**: Transaction data is encrypted and stored per GDPR/DPDP Act requirements

**RISK DISCLAIMER**: Past performance does not guarantee future results. All investments carry risk.
**REGULATORY NOTICE**: This platform is registered with appropriate financial authorities.

Last updated: ${new Date().toISOString().split('T')[0]}
  `,
  
  VALUATION_DISCLAIMER: `
**BUSINESS VALUATION DISCLAIMER**

Our AI-powered valuation service provides estimates based on available data and market analysis:

1. **Estimation Only**: Valuations are estimates and not guaranteed accurate assessments
2. **Due Diligence**: Buyers must conduct independent due diligence before any transaction
3. **Market Conditions**: Valuations may change based on market conditions and economic factors
4. **Professional Advice**: Consult qualified financial advisors for investment decisions
5. **Liability Limitation**: We are not liable for decisions made based on our valuations

**IMPORTANT**: This is not financial advice. Always consult professional advisors.
  `,
  
  PAYMENT_TERMS: `
**PAYMENT PROCESSING TERMS**

By using our payment services, you agree to:

1. **Third-Party Processing**: Payments processed through licensed payment gateways (Stripe, Razorpay)
2. **Processing Fees**: Standard processing fees apply as disclosed at checkout
3. **Refund Policy**: Refunds subject to our terms and service provider policies
4. **Chargeback Protection**: Transactions are protected against unauthorized chargebacks
5. **Currency Conversion**: International transactions subject to current exchange rates
6. **Data Sharing**: Payment data shared with processors for fraud prevention

**SECURITY**: All payment data is PCI DSS compliant and encrypted.
  `,
  
  SUBSCRIPTION_TERMS: `
**SUBSCRIPTION SERVICE TERMS**

Subscription to our premium services includes:

1. **Billing Cycle**: Monthly recurring charges unless cancelled
2. **Cancellation**: Cancel anytime with 7-day notice period
3. **Refund Policy**: Pro-rated refunds for unused subscription periods
4. **Service Availability**: 99.9% uptime SLA with compensation for outages
5. **Feature Changes**: Premium features may change with 30-day notice
6. **Data Retention**: Premium data retained for 1 year after cancellation

**AUTO-RENEWAL**: Subscriptions auto-renew unless cancelled before next billing cycle.
  `
};

// Audit logging system for financial operations
export interface AuditLog {
  id: string;
  userId: number;
  action: string;
  entityType: 'escrow' | 'payment' | 'subscription' | 'valuation' | 'commission';
  entityId: string;
  amount?: number;
  currency?: string;
  status: 'initiated' | 'completed' | 'failed' | 'cancelled';
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  complianceFlags?: string[];
}

class ComplianceService {
  private auditLogs: AuditLog[] = [];
  
  async logFinancialOperation(data: Omit<AuditLog, 'id' | 'timestamp'>) {
    const auditLog: AuditLog = {
      ...data,
      id: this.generateAuditId(),
      timestamp: new Date()
    };
    
    this.auditLogs.push(auditLog);
    
    // In production, this should be stored in a secure audit database
    console.log('🔐 FINANCIAL AUDIT LOG:', JSON.stringify(auditLog, null, 2));
    
    // Check for compliance violations
    await this.checkComplianceViolations(auditLog);
    
    return auditLog;
  }
  
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async checkComplianceViolations(log: AuditLog) {
    const violations: string[] = [];
    
    // Check for large transaction amounts (above ₹10 lakh)
    if (log.amount && log.amount > 1000000) {
      violations.push('LARGE_TRANSACTION_ALERT');
    }
    
    // Check for rapid successive transactions
    const recentLogs = this.auditLogs.filter(
      l => l.userId === log.userId && 
           l.timestamp.getTime() > Date.now() - 5 * 60 * 1000 // Last 5 minutes
    );
    
    if (recentLogs.length > 5) {
      violations.push('RAPID_TRANSACTION_PATTERN');
    }
    
    // Check for unusual IP patterns
    const userIPs = new Set(
      this.auditLogs
        .filter(l => l.userId === log.userId)
        .map(l => l.ipAddress)
    );
    
    if (userIPs.size > 5) {
      violations.push('MULTIPLE_IP_USAGE');
    }
    
    if (violations.length > 0) {
      console.warn('⚠️ COMPLIANCE VIOLATIONS DETECTED:', {
        userId: log.userId,
        violations,
        logId: log.id
      });
      
      // Update the log with compliance flags
      log.complianceFlags = violations;
    }
  }
  
  async getAuditLogs(userId?: number, entityType?: string): Promise<AuditLog[]> {
    let logs = this.auditLogs;
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    if (entityType) {
      logs = logs.filter(log => log.entityType === entityType);
    }
    
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  async generateComplianceReport(startDate: Date, endDate: Date) {
    const logs = this.auditLogs.filter(
      log => log.timestamp >= startDate && log.timestamp <= endDate
    );
    
    const report = {
      period: { startDate, endDate },
      totalTransactions: logs.length,
      totalAmount: logs.reduce((sum, log) => sum + (log.amount || 0), 0),
      transactionsByType: this.groupByEntityType(logs),
      complianceViolations: logs.filter(log => log.complianceFlags?.length),
      statusBreakdown: this.groupByStatus(logs),
      userActivity: this.groupByUser(logs)
    };
    
    return report;
  }
  
  private groupByEntityType(logs: AuditLog[]) {
    const groups: Record<string, number> = {};
    logs.forEach(log => {
      groups[log.entityType] = (groups[log.entityType] || 0) + 1;
    });
    return groups;
  }
  
  private groupByStatus(logs: AuditLog[]) {
    const groups: Record<string, number> = {};
    logs.forEach(log => {
      groups[log.status] = (groups[log.status] || 0) + 1;
    });
    return groups;
  }
  
  private groupByUser(logs: AuditLog[]) {
    const groups: Record<number, number> = {};
    logs.forEach(log => {
      groups[log.userId] = (groups[log.userId] || 0) + 1;
    });
    return groups;
  }
  
  // KYC/AML compliance checks
  async performKYCCheck(userId: number, transactionAmount: number): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) return false;
    
    // Check if user is verified
    if (!user.isVerified) {
      return false;
    }
    
    // Check transaction limits based on KYC level
    const kycLevel = user.kycLevel || 'basic';
    const limits = {
      basic: 50000,    // ₹50,000
      advanced: 200000, // ₹2,00,000
      premium: 1000000  // ₹10,00,000
    };
    
    return transactionAmount <= limits[kycLevel as keyof typeof limits];
  }
  
  // AML transaction monitoring
  async monitorTransaction(userId: number, amount: number, counterpartyId?: number) {
    const flags: string[] = [];
    
    // Check for structuring (multiple transactions just below reporting threshold)
    const recentTransactions = this.auditLogs.filter(
      log => log.userId === userId && 
             log.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000 && // Last 24 hours
             log.amount && log.amount > 45000 && log.amount < 50000
    );
    
    if (recentTransactions.length > 3) {
      flags.push('POTENTIAL_STRUCTURING');
    }
    
    // Check for round number transactions (potential suspicious activity)
    if (amount % 10000 === 0 && amount > 100000) {
      flags.push('ROUND_NUMBER_TRANSACTION');
    }
    
    // Check for velocity (too many transactions in short time)
    const dailyTransactions = this.auditLogs.filter(
      log => log.userId === userId && 
             log.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    
    if (dailyTransactions.length > 10) {
      flags.push('HIGH_VELOCITY_TRANSACTIONS');
    }
    
    if (flags.length > 0) {
      console.warn('🚨 AML ALERT:', {
        userId,
        amount,
        flags,
        timestamp: new Date().toISOString()
      });
    }
    
    return flags;
  }
}

export const complianceService = new ComplianceService();

// Middleware for automatic compliance logging
export const complianceMiddleware = (entityType: AuditLog['entityType']) => {
  return async (req: any, res: any, next: any) => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      if (req.user && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        complianceService.logFinancialOperation({
          userId: req.user.id,
          action: `${req.method} ${req.path}`,
          entityType,
          entityId: req.params.id || 'unknown',
          amount: req.body?.amount,
          currency: req.body?.currency || 'INR',
          status: res.statusCode < 400 ? 'completed' : 'failed',
          metadata: {
            requestBody: req.body,
            responseStatus: res.statusCode,
            endpoint: req.path
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || 'unknown'
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};