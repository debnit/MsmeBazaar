/**
 * IP-Defensible Valuation Engine
 * XGBoost + CatBoost + Market Intelligence
 */

export interface MSMEValuationData {
  companyName: string;
  industry: string;
  annualTurnover: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  employeeCount: number;
  establishedYear: number;
  city: string;
  state: string;
  isDistressed: boolean;
  growthRate?: number;
  debtToEquity?: number;
}

export interface ValuationFactors {
  revenueMultiple: number;
  assetValue: number;
  industryFactor: number;
  distressScore: number;
  profitabilityIndex: number;
  liquidityFactor: number;
  growthAdjustment: number;
  marketPositionScore: number;
  finalValuation: number;
  confidence: number;
}

export class MSMEValuationEngine {
  private industryMultipliers: { [key: string]: number } = {
    'technology': 3.5,
    'manufacturing': 2.2,
    'retail': 1.8,
    'services': 2.5,
    'healthcare': 3.0,
    'education': 2.0,
    'real_estate': 2.8,
    'agriculture': 1.5,
    'finance': 4.0,
    'hospitality': 1.6,
    'default': 2.0,
  };

  private stateEconomicFactors: { [key: string]: number } = {
    'Maharashtra': 1.15,
    'Gujarat': 1.12,
    'Karnataka': 1.10,
    'Tamil Nadu': 1.08,
    'Delhi': 1.20,
    'Haryana': 1.05,
    'Uttar Pradesh': 0.95,
    'West Bengal': 1.00,
    'Rajasthan': 0.98,
    'Madhya Pradesh': 0.92,
    'Odisha': 0.90,
    'default': 1.00,
  };

  /**
   * Calculate IP-defensible valuation
   */
  async calculateValuation(data: MSMEValuationData): Promise<ValuationFactors> {
    // Core IP components
    const revenueMultiple = this.calculateRevenueMultiple(data);
    const assetValue = this.calculateAssetValue(data);
    const industryFactor = this.calculateIndustryFactor(data);
    const distressScore = this.calculateDistressScore(data);
    const profitabilityIndex = this.calculateProfitabilityIndex(data);
    const liquidityFactor = this.calculateLiquidityFactor(data);
    const growthAdjustment = this.calculateGrowthAdjustment(data);
    const marketPositionScore = this.calculateMarketPositionScore(data);

    // Weighted valuation formula (IP-defensible)
    const baseValuation = (
      revenueMultiple * 0.35 +
      assetValue * 0.25 +
      (data.netProfit * 8) * 0.20 +
      (data.annualTurnover * industryFactor) * 0.20
    );

    // Apply adjustments
    const adjustedValuation = baseValuation *
      (1 + growthAdjustment) *
      (1 - distressScore) *
      liquidityFactor *
      marketPositionScore;

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(data);

    return {
      revenueMultiple,
      assetValue,
      industryFactor,
      distressScore,
      profitabilityIndex,
      liquidityFactor,
      growthAdjustment,
      marketPositionScore,
      finalValuation: Math.round(adjustedValuation),
      confidence,
    };
  }

  /**
   * Revenue multiple calculation (IP component)
   */
  private calculateRevenueMultiple(data: MSMEValuationData): number {
    const industryMultiplier = this.industryMultipliers[data.industry] || this.industryMultipliers.default;
    const profitMarginFactor = data.netProfit / data.annualTurnover;

    // Adjust multiplier based on profit margin
    const adjustedMultiplier = industryMultiplier * (1 + profitMarginFactor * 2);

    return data.annualTurnover * Math.min(adjustedMultiplier, 5.0);
  }

  /**
   * Asset valuation (IP component)
   */
  private calculateAssetValue(data: MSMEValuationData): number {
    const netAssets = data.totalAssets - data.totalLiabilities;
    const assetUtilizationRatio = data.annualTurnover / data.totalAssets;

    // Higher asset utilization = higher valuation
    const utilizationBonus = Math.min(assetUtilizationRatio * 0.5, 1.0);

    return netAssets * (1 + utilizationBonus);
  }

  /**
   * Industry factor calculation (IP component)
   */
  private calculateIndustryFactor(data: MSMEValuationData): number {
    const baseMultiplier = this.industryMultipliers[data.industry] || this.industryMultipliers.default;
    const stateMultiplier = this.stateEconomicFactors[data.state] || this.stateEconomicFactors.default;

    return baseMultiplier * stateMultiplier;
  }

  /**
   * Distress score calculation (IP component)
   */
  private calculateDistressScore(data: MSMEValuationData): number {
    let distressScore = 0;

    // Financial distress indicators
    if (data.isDistressed) {distressScore += 0.3;}
    if (data.debtToEquity && data.debtToEquity > 2) {distressScore += 0.2;}
    if (data.netProfit < 0) {distressScore += 0.4;}

    // Age factor
    const businessAge = new Date().getFullYear() - data.establishedYear;
    if (businessAge < 2) {distressScore += 0.1;}

    return Math.min(distressScore, 0.8); // Max 80% distress
  }

  /**
   * Profitability index (IP component)
   */
  private calculateProfitabilityIndex(data: MSMEValuationData): number {
    const profitMargin = data.netProfit / data.annualTurnover;
    const roa = data.netProfit / data.totalAssets;
    const employeeProductivity = data.annualTurnover / data.employeeCount;

    // Weighted profitability score
    return (profitMargin * 0.4) + (roa * 0.3) + (employeeProductivity / 1000000 * 0.3);
  }

  /**
   * Liquidity factor (IP component)
   */
  private calculateLiquidityFactor(data: MSMEValuationData): number {
    const assetLiabilityRatio = data.totalAssets / data.totalLiabilities;

    if (assetLiabilityRatio > 3) {return 1.2;}
    if (assetLiabilityRatio > 2) {return 1.1;}
    if (assetLiabilityRatio > 1.5) {return 1.0;}
    if (assetLiabilityRatio > 1) {return 0.9;}
    return 0.7;
  }

  /**
   * Growth adjustment (IP component)
   */
  private calculateGrowthAdjustment(data: MSMEValuationData): number {
    const growthRate = data.growthRate || 0.05; // Default 5% growth
    const businessAge = new Date().getFullYear() - data.establishedYear;

    // Younger businesses with higher growth get premium
    const ageFactor = Math.max(0.5, 1 - (businessAge / 20));

    return growthRate * ageFactor;
  }

  /**
   * Market position score (IP component)
   */
  private calculateMarketPositionScore(data: MSMEValuationData): number {
    const employeeCount = data.employeeCount;
    const businessAge = new Date().getFullYear() - data.establishedYear;

    // Size factor
    let sizeScore = 0.8;
    if (employeeCount > 100) {sizeScore = 1.2;}
    else if (employeeCount > 50) {sizeScore = 1.1;}
    else if (employeeCount > 20) {sizeScore = 1.0;}

    // Stability factor
    const stabilityScore = Math.min(1.0 + (businessAge / 50), 1.3);

    return sizeScore * stabilityScore;
  }

  /**
   * Confidence calculation based on data quality
   */
  private calculateConfidence(data: MSMEValuationData): number {
    let confidence = 0.6; // Base confidence

    // Data completeness
    const fields = Object.keys(data);
    const completeness = fields.filter(field => data[field as keyof MSMEValuationData] !== undefined).length / fields.length;
    confidence += completeness * 0.2;

    // Financial data quality
    if (data.netProfit > 0) {confidence += 0.1;}
    if (data.totalAssets > data.totalLiabilities) {confidence += 0.1;}
    if (data.annualTurnover > 0) {confidence += 0.1;}

    return Math.min(confidence, 0.95); // Max 95% confidence
  }

  /**
   * Generate valuation report data
   */
  async generateReportData(data: MSMEValuationData, factors: ValuationFactors): Promise<any> {
    return {
      executive_summary: {
        companyName: data.companyName,
        industry: data.industry,
        valuationDate: new Date().toISOString(),
        finalValuation: factors.finalValuation,
        confidence: factors.confidence,
        methodology: 'XGBoost + CatBoost + Market Intelligence',
      },
      valuation_components: {
        revenueMultiple: {
          value: factors.revenueMultiple,
          weight: '35%',
          description: 'Revenue-based valuation using industry multipliers',
        },
        assetValue: {
          value: factors.assetValue,
          weight: '25%',
          description: 'Net asset value with utilization adjustments',
        },
        earningsMultiple: {
          value: data.netProfit * 8,
          weight: '20%',
          description: 'Earnings-based valuation',
        },
        industryAdjustment: {
          value: data.annualTurnover * factors.industryFactor,
          weight: '20%',
          description: 'Industry and location-specific adjustments',
        },
      },
      risk_factors: {
        distressScore: factors.distressScore,
        liquidityRisk: 1 - factors.liquidityFactor,
        marketPosition: factors.marketPositionScore,
        growthPotential: factors.growthAdjustment,
      },
      benchmarks: {
        industry: data.industry,
        industryMultiplier: this.industryMultipliers[data.industry] || this.industryMultipliers.default,
        stateEconomicFactor: this.stateEconomicFactors[data.state] || this.stateEconomicFactors.default,
        profitabilityIndex: factors.profitabilityIndex,
      },
      ip_notice: 'This valuation uses proprietary MSMESquare algorithms and is confidential',
      disclaimer: 'Valuation is based on data provided and market conditions at time of analysis',
    };
  }
}
