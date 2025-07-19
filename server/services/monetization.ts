import { storage } from '../storage';
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import type {
  InsertValuationPayment,
  InsertMatchmakingReportPayment,
  InsertAgentCommission,
  InsertPlatformRevenue,
  InsertLeadCredit,
  InsertLeadPurchase,
  InsertApiAccess,
  User,
  MsmeListing,
  LoanApplication,
} from '@shared/schema';

// Initialize Stripe if available
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}) : null;

export class MonetizationService {
  // 1. Agent Commission - % on successful deal closure
  async calculateAgentCommission(
    agentId: number,
    dealId: number,
    msmeId: number,
    dealValue: number,
    commissionRate: number = 2.5, // Default 2.5%
  ): Promise<void> {
    const commissionAmount = (dealValue * commissionRate) / 100;

    const commission: InsertAgentCommission = {
      agentId,
      dealId,
      msmeId,
      commissionRate,
      dealValue,
      commissionAmount,
      status: 'pending',
    };

    await storage.createAgentCommission(commission);

    // Record platform revenue
    await this.recordPlatformRevenue({
      source: 'commission',
      userId: agentId,
      dealId,
      msmeId,
      amount: commissionAmount,
      percentage: commissionRate,
      status: 'pending',
    });
  }

  // 2. Valuation-as-a-Service - Pay for instant valuation PDF
  async createValuationPayment(
    userId: number,
    msmeId: number,
    amount: number = 299,
  ): Promise<{ paymentIntent: any; paymentRecord: any }> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'inr',
      metadata: {
        type: 'valuation_pdf',
        userId: userId.toString(),
        msmeId: msmeId.toString(),
      },
    });

    const paymentRecord: InsertValuationPayment = {
      userId,
      msmeId,
      paymentId: paymentIntent.id,
      amount,
      status: 'pending',
      pdfGenerated: false,
    };

    const payment = await storage.createValuationPayment(paymentRecord);

    return { paymentIntent, paymentRecord: payment };
  }

  // 3. Matchmaking Report PDF - ₹99 for downloadable report
  async createMatchmakingReportPayment(
    userId: number,
    msmeId: number,
    amount: number = 99,
  ): Promise<{ paymentIntent: any; paymentRecord: any }> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'inr',
      metadata: {
        type: 'matchmaking_report',
        userId: userId.toString(),
        msmeId: msmeId.toString(),
      },
    });

    const paymentRecord: InsertMatchmakingReportPayment = {
      userId,
      msmeId,
      paymentId: paymentIntent.id,
      amount,
      status: 'pending',
      reportGenerated: false,
    };

    const payment = await storage.createMatchmakingReportPayment(paymentRecord);

    return { paymentIntent, paymentRecord: payment };
  }

  // 4. Premium Buyer Access - Check user subscription
  async checkPremiumAccess(userId: number): Promise<boolean> {
    const subscription = await storage.getUserActiveSubscription(userId);
    return subscription?.status === 'active' && subscription.planId !== null;
  }

  // 5. Escrow Revenue Cut - Platform keeps 1-2% as facilitation fee
  async calculateEscrowFee(
    escrowAmount: number,
    feePercentage: number = 1.5,
  ): Promise<number> {
    return (escrowAmount * feePercentage) / 100;
  }

  async deductEscrowFee(
    escrowId: number,
    dealId: number,
    msmeId: number,
    escrowAmount: number,
    feePercentage: number = 1.5,
  ): Promise<number> {
    const feeAmount = await this.calculateEscrowFee(escrowAmount, feePercentage);

    // Record platform revenue
    await this.recordPlatformRevenue({
      source: 'escrow',
      dealId,
      msmeId,
      amount: feeAmount,
      percentage: feePercentage,
      status: 'collected',
    });

    return escrowAmount - feeAmount;
  }

  // 6. Leads as a Service (LaaS) - MSMEs pay for buyer leads
  async purchaseLead(
    sellerId: number,
    buyerId: number,
    msmeId: number,
    creditsRequired: number = 1,
  ): Promise<{ success: boolean; contactInfo?: any; message: string }> {
    const credits = await storage.getLeadCredits(sellerId);

    if (!credits || credits.remainingCredits < creditsRequired) {
      return {
        success: false,
        message: 'Insufficient credits. Please purchase more credits.',
      };
    }

    // Get buyer contact information
    const buyer = await storage.getUser(buyerId);
    if (!buyer) {
      return {
        success: false,
        message: 'Buyer not found',
      };
    }

    const contactInfo = {
      email: buyer.email,
      phone: buyer.phone,
      firstName: buyer.firstName,
      lastName: buyer.lastName,
    };

    // Record the lead purchase
    const leadPurchase: InsertLeadPurchase = {
      sellerId,
      buyerId,
      msmeId,
      creditsUsed: creditsRequired,
      contactInfo,
      monthYear: new Date().toISOString().slice(0, 7), // YYYY-MM
    };

    await storage.createLeadPurchase(leadPurchase);

    // Update credits
    await storage.updateLeadCredits(sellerId, {
      usedCredits: credits.usedCredits + creditsRequired,
      remainingCredits: credits.remainingCredits - creditsRequired,
    });

    // Record platform revenue
    await this.recordPlatformRevenue({
      source: 'leads',
      userId: sellerId,
      msmeId,
      amount: creditsRequired * 50, // Assume ₹50 per lead
      status: 'collected',
    });

    return {
      success: true,
      contactInfo,
      message: 'Lead purchased successfully',
    };
  }

  // 7. Success Fee - % of deal value post-confirmation
  async calculateSuccessFee(
    dealId: number,
    dealValue: number,
    feePercentage: number = 3.0,
  ): Promise<void> {
    const feeAmount = (dealValue * feePercentage) / 100;

    const loan = await storage.getLoanApplication(dealId);
    if (!loan) {
      throw new Error('Loan application not found');
    }

    // Record platform revenue
    await this.recordPlatformRevenue({
      source: 'success_fee',
      dealId,
      msmeId: loan.msmeId,
      amount: feeAmount,
      percentage: feePercentage,
      status: 'pending',
    });
  }

  // 8. API Access for Banks/NBFCs - Paid access to verified MSMEs
  async createApiAccess(
    userId: number,
    planType: 'basic' | 'premium' | 'enterprise' = 'basic',
  ): Promise<string> {
    const planLimits = {
      basic: 1000,
      premium: 5000,
      enterprise: 20000,
    };

    const apiKey = `msme_${nanoid(32)}`;
    const requestsLimit = planLimits[planType];

    const apiAccess: InsertApiAccess = {
      userId,
      apiKey,
      planType,
      requestsLimit,
      requestsUsed: 0,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    await storage.createApiAccess(apiAccess);

    return apiKey;
  }

  async validateApiKey(apiKey: string): Promise<{ valid: boolean; userId?: number; remaining?: number }> {
    const access = await storage.getApiAccess(apiKey);

    if (!access || !access.isActive || (access.expiresAt && access.expiresAt < new Date())) {
      return { valid: false };
    }

    if (access.requestsUsed >= access.requestsLimit) {
      return { valid: false };
    }

    // Increment usage
    await storage.updateApiAccess(access.id, {
      requestsUsed: access.requestsUsed + 1,
    });

    return {
      valid: true,
      userId: access.userId,
      remaining: access.requestsLimit - access.requestsUsed - 1,
    };
  }

  // Helper: Record platform revenue
  async recordPlatformRevenue(data: InsertPlatformRevenue): Promise<void> {
    await storage.createPlatformRevenue(data);
  }

  // Helper: Get revenue analytics
  async getRevenueAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    revenueBySource: Record<string, number>;
    monthlyRevenue: Record<string, number>;
  }> {
    const revenues = await storage.getPlatformRevenue({
      startDate,
      endDate,
      status: 'collected',
    });

    const totalRevenue = revenues.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);

    const revenueBySource = revenues.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + parseFloat(r.amount.toString());
      return acc;
    }, {} as Record<string, number>);

    const monthlyRevenue = revenues.reduce((acc, r) => {
      const month = r.createdAt.toISOString().slice(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + parseFloat(r.amount.toString());
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRevenue,
      revenueBySource,
      monthlyRevenue,
    };
  }

  // Helper: Process completed payment
  async processCompletedPayment(paymentId: string, type: string): Promise<void> {
    if (type === 'valuation_pdf') {
      await storage.updateValuationPayment(paymentId, {
        status: 'completed',
      });

      // Record platform revenue
      const payment = await storage.getValuationPaymentByPaymentId(paymentId);
      if (payment) {
        await this.recordPlatformRevenue({
          source: 'valuation',
          userId: payment.userId,
          msmeId: payment.msmeId,
          amount: payment.amount,
          status: 'collected',
        });
      }
    } else if (type === 'matchmaking_report') {
      await storage.updateMatchmakingReportPayment(paymentId, {
        status: 'completed',
      });

      // Record platform revenue
      const payment = await storage.getMatchmakingReportPaymentByPaymentId(paymentId);
      if (payment) {
        await this.recordPlatformRevenue({
          source: 'matchmaking',
          userId: payment.userId,
          msmeId: payment.msmeId,
          amount: payment.amount,
          status: 'collected',
        });
      }
    }
  }
}

export const monetizationService = new MonetizationService();
