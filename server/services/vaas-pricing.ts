/**
 * VaaS (Valuation-as-a-Service) Pricing Engine
 * Implements defensible IP monetization model
 */

import { db } from '../db';
import { valuationRequests, valuationReports, users } from '@shared/schema';
import { eq, and, gte, count, sum, desc } from 'drizzle-orm';

export interface ValuationPricingTier {
  id: string;
  name: string;
  price: number;
  features: string[];
  apiCallLimit?: number;
  reportFormat: 'basic' | 'detailed' | 'premium';
  targetUser: 'msme' | 'agent' | 'buyer' | 'nbfc';
}

export const PRICING_TIERS: ValuationPricingTier[] = [
  {
    id: 'msme-basic',
    name: 'MSME Self-Valuation',
    price: 199,
    features: [
      'Basic valuation report',
      'Industry benchmarking',
      'Risk assessment',
      'PDF download'
    ],
    reportFormat: 'basic',
    targetUser: 'msme'
  },
  {
    id: 'msme-premium',
    name: 'MSME Premium Valuation',
    price: 499,
    features: [
      'Detailed valuation report',
      'Market comparables',
      'Growth projections',
      'Investor-ready format',
      'Branded PDF report'
    ],
    reportFormat: 'detailed',
    targetUser: 'msme'
  },
  {
    id: 'agent-commission',
    name: 'Agent Commission Split',
    price: 0, // Free for agents, revenue from commission split
    features: [
      'Unlimited valuations',
      'Commission tracking',
      'Client reports',
      'White-label branding'
    ],
    reportFormat: 'detailed',
    targetUser: 'agent'
  },
  {
    id: 'buyer-diligence',
    name: 'Buyer Due Diligence',
    price: 999,
    features: [
      'Premium valuation report',
      'Deep financial analysis',
      'Risk factor assessment',
      'Negotiation insights',
      'Competitive analysis'
    ],
    reportFormat: 'premium',
    targetUser: 'buyer'
  },
  {
    id: 'nbfc-saas',
    name: 'NBFC SaaS Access',
    price: 5000, // Monthly SaaS fee
    features: [
      'API access',
      'Bulk valuations',
      'Credit assessment integration',
      'Custom scoring models',
      'Analytics dashboard'
    ],
    apiCallLimit: 1000,
    reportFormat: 'premium',
    targetUser: 'nbfc'
  },
  {
    id: 'api-per-call',
    name: 'White-label API',
    price: 10, // Per API call
    features: [
      'REST API access',
      'Custom branding',
      'Real-time valuations',
      'Integration support'
    ],
    reportFormat: 'basic',
    targetUser: 'nbfc'
  }
];

export class VaaSPricingEngine {
  /**
   * Calculate pricing for valuation request
   */
  async calculatePricing(
    userId: number,
    valuationType: string,
    msmeData: any
  ): Promise<{
    tier: ValuationPricingTier;
    finalPrice: number;
    discounts: any[];
    networkEffectBonus: number;
  }> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Determine base tier
    const baseTier = this.getBaseTierForUser(user.role as any, valuationType);
    
    // Calculate network effect bonus
    const networkBonus = await this.calculateNetworkEffectBonus(userId);
    
    // Apply discounts
    const discounts = await this.calculateDiscounts(userId, baseTier);
    
    const finalPrice = Math.max(0, baseTier.price - discounts.reduce((sum, d) => sum + d.amount, 0));
    
    return {
      tier: baseTier,
      finalPrice,
      discounts,
      networkEffectBonus: networkBonus
    };
  }

  /**
   * Get base pricing tier for user type
   */
  private getBaseTierForUser(userRole: string, valuationType: string): ValuationPricingTier {
    const roleMapping = {
      'seller': 'msme-basic',
      'buyer': 'buyer-diligence',
      'agent': 'agent-commission',
      'nbfc': 'nbfc-saas'
    };

    const tierId = roleMapping[userRole as keyof typeof roleMapping] || 'msme-basic';
    return PRICING_TIERS.find(t => t.id === tierId) || PRICING_TIERS[0];
  }

  /**
   * Calculate network effect bonus (higher trust = premium pricing)
   */
  async calculateNetworkEffectBonus(userId: number): Promise<number> {
    // Count user's completed valuations
    const completedValuations = await db.select({ count: count() })
      .from(valuationRequests)
      .where(
        and(
          eq(valuationRequests.userId, userId),
          eq(valuationRequests.status, 'completed')
        )
      );

    // More valuations = higher trust = premium pricing capability
    const baseBonus = Math.min(completedValuations[0]?.count || 0, 50) * 10; // Max ₹500 bonus
    
    return baseBonus;
  }

  /**
   * Calculate applicable discounts
   */
  private async calculateDiscounts(userId: number, tier: ValuationPricingTier): Promise<any[]> {
    const discounts = [];

    // Volume discount for NBFCs
    if (tier.targetUser === 'nbfc') {
      const monthlyUsage = await this.getMonthlyApiUsage(userId);
      if (monthlyUsage > 500) {
        discounts.push({
          type: 'volume',
          amount: tier.price * 0.2, // 20% discount
          reason: 'High volume usage'
        });
      }
    }

    // First-time user discount
    const isFirstTime = await this.isFirstTimeUser(userId);
    if (isFirstTime && tier.targetUser === 'msme') {
      discounts.push({
        type: 'first-time',
        amount: 50,
        reason: 'First-time user discount'
      });
    }

    return discounts;
  }

  /**
   * Get monthly API usage for user
   */
  private async getMonthlyApiUsage(userId: number): Promise<number> {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const usage = await db.select({ count: count() })
      .from(valuationRequests)
      .where(
        and(
          eq(valuationRequests.userId, userId),
          gte(valuationRequests.createdAt, lastMonth)
        )
      );

    return usage[0]?.count || 0;
  }

  /**
   * Check if user is first-time
   */
  private async isFirstTimeUser(userId: number): Promise<boolean> {
    const previousRequests = await db.select({ count: count() })
      .from(valuationRequests)
      .where(eq(valuationRequests.userId, userId));

    return (previousRequests[0]?.count || 0) === 0;
  }

  /**
   * Track valuation for IP defensibility
   */
  async trackValuationIP(
    userId: number,
    valuationId: string,
    model: any,
    factors: any
  ): Promise<void> {
    const ipRecord = {
      valuationId,
      userId,
      modelVersion: model.version,
      factorScores: factors,
      timestamp: new Date(),
      ipFingerprint: this.generateIPFingerprint(model, factors)
    };

    // Store in valuation ledger for IP retention
    await db.insert(valuationReports).values({
      id: valuationId,
      userId,
      msmeId: factors.msmeId,
      estimatedValue: factors.finalValuation,
      confidence: factors.confidence,
      methodology: JSON.stringify(ipRecord),
      createdAt: new Date()
    });
  }

  /**
   * Generate IP fingerprint for defensibility
   */
  private generateIPFingerprint(model: any, factors: any): string {
    const components = [
      model.version,
      factors.revenueMultiple,
      factors.assetValue,
      factors.industryFactor,
      factors.distressScore,
      factors.profitabilityIndex
    ];

    return Buffer.from(JSON.stringify(components)).toString('base64');
  }

  /**
   * Get pricing analytics for network effect
   */
  async getPricingAnalytics(): Promise<{
    totalValuations: number;
    avgConfidence: number;
    revenueByTier: any[];
    networkGrowth: number;
  }> {
    const totalValuations = await db.select({ count: count() })
      .from(valuationRequests);

    const avgConfidence = await db.select({ avg: sum(valuationReports.confidence) })
      .from(valuationReports);

    // Revenue by tier (mock data - would connect to payments)
    const revenueByTier = [
      { tier: 'MSME', revenue: 45000, count: 200 },
      { tier: 'Buyer', revenue: 89000, count: 89 },
      { tier: 'NBFC', revenue: 125000, count: 25 },
      { tier: 'API', revenue: 78000, count: 780 }
    ];

    return {
      totalValuations: totalValuations[0]?.count || 0,
      avgConfidence: avgConfidence[0]?.avg || 0,
      revenueByTier,
      networkGrowth: 0.23 // 23% month-over-month growth
    };
  }
}

export const vaaSPricing = new VaaSPricingEngine();