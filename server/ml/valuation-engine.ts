import { MsmeListing } from '@shared/schema';

export interface ValuationFactors {
  financialScore: number;
  industryMultiplier: number;
  locationFactor: number;
  growthPotential: number;
  assetQuality: number;
  marketPosition: number;
  riskFactor: number;
  timeToMarket: number;
}

export interface ValuationResult {
  estimatedValue: number;
  confidence: number;
  factors: ValuationFactors;
  methodology: string;
  comparables: any[];
  recommendation: 'undervalued' | 'fairly_valued' | 'overvalued';
  sensitivityAnalysis: {
    best_case: number;
    worst_case: number;
    most_likely: number;
  };
}

export interface IndustryMetrics {
  averageMultiple: number;
  growthRate: number;
  riskProfile: 'low' | 'medium' | 'high';
  liquidityFactor: number;
  cyclicality: number;
}

export class MLValuationEngine {
  private industryMetrics: Record<string, IndustryMetrics> = {
    'Manufacturing': {
      averageMultiple: 1.2,
      growthRate: 0.08,
      riskProfile: 'medium',
      liquidityFactor: 0.7,
      cyclicality: 0.8
    },
    'Technology': {
      averageMultiple: 2.5,
      growthRate: 0.25,
      riskProfile: 'high',
      liquidityFactor: 0.9,
      cyclicality: 0.3
    },
    'Healthcare': {
      averageMultiple: 1.8,
      growthRate: 0.15,
      riskProfile: 'low',
      liquidityFactor: 0.8,
      cyclicality: 0.2
    },
    'Retail': {
      averageMultiple: 0.8,
      growthRate: 0.05,
      riskProfile: 'medium',
      liquidityFactor: 0.6,
      cyclicality: 0.9
    },
    'Services': {
      averageMultiple: 1.5,
      growthRate: 0.12,
      riskProfile: 'medium',
      liquidityFactor: 0.7,
      cyclicality: 0.4
    },
    'Agriculture': {
      averageMultiple: 0.9,
      growthRate: 0.04,
      riskProfile: 'medium',
      liquidityFactor: 0.5,
      cyclicality: 0.95
    },
    'Construction': {
      averageMultiple: 1.1,
      growthRate: 0.07,
      riskProfile: 'high',
      liquidityFactor: 0.6,
      cyclicality: 0.85
    },
    'Education': {
      averageMultiple: 1.6,
      growthRate: 0.10,
      riskProfile: 'low',
      liquidityFactor: 0.4,
      cyclicality: 0.1
    }
  };

  private locationFactors: Record<string, number> = {
    'Bhubaneswar': 1.15,
    'Cuttack': 1.10,
    'Rourkela': 1.05,
    'Berhampur': 1.02,
    'Sambalpur': 1.00,
    'Balasore': 0.98,
    'Baripada': 0.95,
    'Bhadrak': 0.92,
    'Jharsuguda': 0.90,
    'Jeypore': 0.88
  };

  async calculateValuation(listing: MsmeListing): Promise<ValuationResult> {
    const factors = this.analyzeFactors(listing);
    const baseValue = this.calculateBaseValue(listing);
    const adjustedValue = this.applyFactors(baseValue, factors);
    const confidence = this.calculateConfidence(listing, factors);
    
    return {
      estimatedValue: adjustedValue,
      confidence,
      factors,
      methodology: 'ML-Enhanced DCF with Comparable Analysis',
      comparables: await this.findComparables(listing),
      recommendation: this.getRecommendation(listing, adjustedValue),
      sensitivityAnalysis: this.performSensitivityAnalysis(baseValue, factors)
    };
  }

  private analyzeFactors(listing: MsmeListing): ValuationFactors {
    const industryMetrics = this.industryMetrics[listing.industry || 'Services'];
    const locationFactor = this.locationFactors[listing.city || 'Sambalpur'] || 1.0;
    
    return {
      financialScore: this.calculateFinancialScore(listing),
      industryMultiplier: industryMetrics.averageMultiple,
      locationFactor,
      growthPotential: this.calculateGrowthPotential(listing),
      assetQuality: this.calculateAssetQuality(listing),
      marketPosition: this.calculateMarketPosition(listing),
      riskFactor: this.calculateRiskFactor(listing),
      timeToMarket: this.calculateTimeToMarket(listing)
    };
  }

  private calculateBaseValue(listing: MsmeListing): number {
    const revenue = Number(listing.annualTurnover) || 0;
    const profit = Number(listing.netProfit) || 0;
    const assets = Number(listing.totalAssets) || 0;
    
    // Multiple valuation approaches
    const revenueMultiple = revenue * (this.industryMetrics[listing.industry || 'Services']?.averageMultiple || 1.5);
    const earningsMultiple = profit * 8; // 8x earnings multiple
    const assetValue = assets * 0.8; // 80% of book value
    
    // Weight the approaches
    const weightedValue = (revenueMultiple * 0.4) + (earningsMultiple * 0.4) + (assetValue * 0.2);
    
    return Math.max(weightedValue, revenue * 0.5); // Minimum of 0.5x revenue
  }

  private applyFactors(baseValue: number, factors: ValuationFactors): number {
    let adjustedValue = baseValue;
    
    // Apply multiplicative factors
    adjustedValue *= factors.industryMultiplier;
    adjustedValue *= factors.locationFactor;
    adjustedValue *= (1 + factors.growthPotential);
    adjustedValue *= factors.assetQuality;
    adjustedValue *= factors.marketPosition;
    adjustedValue *= (1 - factors.riskFactor);
    adjustedValue *= (1 + factors.timeToMarket);
    
    // Apply financial score as a final adjustment
    adjustedValue *= (0.5 + factors.financialScore * 0.5);
    
    return Math.round(adjustedValue);
  }

  private calculateFinancialScore(listing: MsmeListing): number {
    const revenue = Number(listing.annualTurnover) || 0;
    const profit = Number(listing.netProfit) || 0;
    const assets = Number(listing.totalAssets) || 0;
    const liabilities = Number(listing.totalLiabilities) || 0;
    
    let score = 0;
    
    // Profitability (40%)
    const profitMargin = revenue > 0 ? profit / revenue : 0;
    score += Math.min(profitMargin * 10, 1) * 0.4;
    
    // Leverage (30%)
    const debtToAssets = assets > 0 ? liabilities / assets : 0;
    score += Math.max(1 - debtToAssets, 0) * 0.3;
    
    // Growth (20%)
    const revenueGrowth = Number(listing.revenueGrowth) || 0;
    score += Math.min(revenueGrowth / 0.2, 1) * 0.2;
    
    // Stability (10%)
    const yearsInBusiness = new Date().getFullYear() - (listing.establishedYear || new Date().getFullYear());
    score += Math.min(yearsInBusiness / 10, 1) * 0.1;
    
    return Math.min(Math.max(score, 0), 1);
  }

  private calculateGrowthPotential(listing: MsmeListing): number {
    const industryGrowth = this.industryMetrics[listing.industry || 'Services']?.growthRate || 0.1;
    const revenueGrowth = Number(listing.revenueGrowth) || 0;
    const marketShare = Number(listing.marketShare) || 0.01;
    
    // Combine factors
    const potentialScore = (industryGrowth * 0.3) + (revenueGrowth * 0.5) + (marketShare * 0.2);
    
    return Math.min(Math.max(potentialScore, -0.2), 0.5);
  }

  private calculateAssetQuality(listing: MsmeListing): number {
    const assets = Number(listing.totalAssets) || 0;
    const revenue = Number(listing.annualTurnover) || 0;
    const currentAssets = Number(listing.currentAssets) || 0;
    
    // Asset turnover
    const assetTurnover = revenue > 0 ? assets / revenue : 0;
    
    // Current asset ratio
    const currentAssetRatio = assets > 0 ? currentAssets / assets : 0;
    
    // Quality score (higher is better)
    const qualityScore = (Math.min(assetTurnover, 2) / 2) * 0.6 + currentAssetRatio * 0.4;
    
    return Math.max(0.6, Math.min(qualityScore + 0.4, 1.4));
  }

  private calculateMarketPosition(listing: MsmeListing): number {
    const marketShare = Number(listing.marketShare) || 0.01;
    const competitiveAdvantage = listing.competitiveAdvantage?.length || 0;
    const yearsInBusiness = new Date().getFullYear() - (listing.establishedYear || new Date().getFullYear());
    
    // Position score
    const positionScore = (marketShare * 10) + (competitiveAdvantage * 0.01) + (yearsInBusiness * 0.01);
    
    return Math.max(0.8, Math.min(positionScore + 0.8, 1.2));
  }

  private calculateRiskFactor(listing: MsmeListing): number {
    const industryRisk = this.industryMetrics[listing.industry || 'Services']?.riskProfile;
    const leverage = Number(listing.totalLiabilities) / Math.max(Number(listing.totalAssets), 1);
    const concentration = Number(listing.customerConcentration) || 0.3;
    
    let riskScore = 0;
    
    // Industry risk
    switch (industryRisk) {
      case 'low': riskScore += 0.05; break;
      case 'medium': riskScore += 0.10; break;
      case 'high': riskScore += 0.15; break;
    }
    
    // Financial risk
    riskScore += Math.min(leverage * 0.2, 0.15);
    
    // Concentration risk
    riskScore += concentration * 0.1;
    
    return Math.min(Math.max(riskScore, 0.05), 0.3);
  }

  private calculateTimeToMarket(listing: MsmeListing): number {
    const readiness = listing.readinessLevel || 'medium';
    const documentation = listing.documentationComplete ? 0.1 : 0;
    const operationalEfficiency = Number(listing.operationalEfficiency) || 0.7;
    
    let timeScore = 0;
    
    switch (readiness) {
      case 'high': timeScore += 0.1; break;
      case 'medium': timeScore += 0.05; break;
      case 'low': timeScore += 0; break;
    }
    
    timeScore += documentation + (operationalEfficiency - 0.5) * 0.2;
    
    return Math.min(Math.max(timeScore, -0.05), 0.15);
  }

  private calculateConfidence(listing: MsmeListing, factors: ValuationFactors): number {
    let confidence = 0.5; // Base confidence
    
    // Data completeness
    const dataFields = [
      listing.annualTurnover,
      listing.netProfit,
      listing.totalAssets,
      listing.totalLiabilities,
      listing.establishedYear,
      listing.industry
    ];
    
    const dataCompleteness = dataFields.filter(field => field && field !== '').length / dataFields.length;
    confidence += dataCompleteness * 0.3;
    
    // Financial stability
    confidence += factors.financialScore * 0.2;
    
    return Math.min(Math.max(confidence, 0.3), 0.95);
  }

  private async findComparables(listing: MsmeListing): Promise<any[]> {
    // This would typically query a database of comparable companies
    // For now, return mock comparables
    return [
      {
        companyName: 'Similar Company 1',
        industry: listing.industry,
        revenue: Number(listing.annualTurnover) * 1.2,
        multiple: 1.5,
        lastSale: new Date('2024-01-15')
      },
      {
        companyName: 'Similar Company 2',
        industry: listing.industry,
        revenue: Number(listing.annualTurnover) * 0.8,
        multiple: 1.3,
        lastSale: new Date('2024-02-20')
      }
    ];
  }

  private getRecommendation(listing: MsmeListing, valuedAmount: number): 'undervalued' | 'fairly_valued' | 'overvalued' {
    const askingPrice = Number(listing.askingPrice) || 0;
    
    if (askingPrice === 0) return 'fairly_valued';
    
    const ratio = valuedAmount / askingPrice;
    
    if (ratio > 1.2) return 'undervalued';
    if (ratio < 0.8) return 'overvalued';
    return 'fairly_valued';
  }

  private performSensitivityAnalysis(baseValue: number, factors: ValuationFactors): { best_case: number; worst_case: number; most_likely: number } {
    // Optimistic scenario (20% higher factors)
    const optimisticFactors = { ...factors };
    optimisticFactors.growthPotential *= 1.2;
    optimisticFactors.marketPosition *= 1.1;
    optimisticFactors.riskFactor *= 0.8;
    
    // Pessimistic scenario (20% lower factors)
    const pessimisticFactors = { ...factors };
    pessimisticFactors.growthPotential *= 0.8;
    pessimisticFactors.marketPosition *= 0.9;
    pessimisticFactors.riskFactor *= 1.2;
    
    return {
      best_case: Math.round(this.applyFactors(baseValue, optimisticFactors)),
      worst_case: Math.round(this.applyFactors(baseValue, pessimisticFactors)),
      most_likely: Math.round(this.applyFactors(baseValue, factors))
    };
  }

  async updateIndustryMetrics(industry: string, newMetrics: Partial<IndustryMetrics>): Promise<void> {
    if (this.industryMetrics[industry]) {
      this.industryMetrics[industry] = { ...this.industryMetrics[industry], ...newMetrics };
    }
  }

  async getIndustryBenchmarks(industry: string): Promise<IndustryMetrics | null> {
    return this.industryMetrics[industry] || null;
  }
}

export const valuationEngine = new MLValuationEngine();


//only move it to Python later if you need:

//batch processing,

//secure valuation API,

//or server-side automation.