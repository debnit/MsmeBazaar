// Advanced ML-powered valuation engine with XGBoost/CatBoost
import axios from 'axios';
import { serverMemoryManager } from '../infrastructure/memory-management';

interface BusinessData {
  id: string;
  revenue: number;
  profit: number;
  assets: number;
  employees: number;
  industry: string;
  location: string;
  yearEstablished: number;
  growthRate: number;
  debtToEquity: number;
  currentRatio: number;
  marketShare: number;
  customerRetention: number;
  digitalPresence: number;
  certifications: string[];
  riskFactors: string[];
}

interface ValuationResult {
  valuation: number;
  confidence: number;
  methodology: 'ml' | 'heuristic' | 'hybrid';
  breakdown: {
    assetValue: number;
    earningsMultiple: number;
    marketAdjustment: number;
    riskAdjustment: number;
  };
  riskScore: number;
  recommendations: string[];
  timestamp: string;
}

interface MLPrediction {
  valuation: number;
  confidence: number;
  features_importance: Record<string, number>;
  model_version: string;
}

class MLValuationEngine {
  private mlServiceUrl: string;
  private fallbackThreshold: number = 0.5;
  private modelVersion: string = '1.0.0';
  private isHealthy: boolean = true;

  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }

  async valuateBusiness(businessData: BusinessData): Promise<ValuationResult> {
    // Try ML prediction first
    const mlResult = await this.tryMLPrediction(businessData);

    if (mlResult && mlResult.confidence >= this.fallbackThreshold) {
      return this.formatMLResult(businessData, mlResult);
    }

    // Fallback to enhanced heuristic method
    console.log(`ML confidence ${mlResult?.confidence || 0} < ${this.fallbackThreshold}, using heuristic fallback`);
    const heuristicResult = await this.heuristicValuation(businessData);

    // Hybrid approach: combine ML and heuristic if ML confidence is moderate
    if (mlResult && mlResult.confidence >= 0.3) {
      return this.hybridValuation(businessData, mlResult, heuristicResult);
    }

    return heuristicResult;
  }

  private async tryMLPrediction(businessData: BusinessData): Promise<MLPrediction | null> {
    try {
      const features = this.extractFeatures(businessData);

      const response = await axios.post(`${this.mlServiceUrl}/predict/valuation`, {
        features,
        model_version: this.modelVersion,
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.ML_API_KEY,
        },
      });

      this.isHealthy = true;
      return response.data;
    } catch (error) {
      console.error('ML prediction failed:', error.message);
      this.isHealthy = false;
      return null;
    }
  }

  private extractFeatures(data: BusinessData): Record<string, number> {
    const currentYear = new Date().getFullYear();
    const businessAge = currentYear - data.yearEstablished;

    return {
      revenue: data.revenue,
      profit: data.profit,
      assets: data.assets,
      employees: data.employees,
      business_age: businessAge,
      growth_rate: data.growthRate,
      debt_to_equity: data.debtToEquity,
      current_ratio: data.currentRatio,
      market_share: data.marketShare,
      customer_retention: data.customerRetention,
      digital_presence: data.digitalPresence,
      profit_margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      revenue_per_employee: data.employees > 0 ? data.revenue / data.employees : 0,
      asset_turnover: data.assets > 0 ? data.revenue / data.assets : 0,
      roa: data.assets > 0 ? (data.profit / data.assets) * 100 : 0,
      industry_technology: data.industry === 'technology' ? 1 : 0,
      industry_healthcare: data.industry === 'healthcare' ? 1 : 0,
      industry_finance: data.industry === 'finance' ? 1 : 0,
      industry_manufacturing: data.industry === 'manufacturing' ? 1 : 0,
      location_tier1: ['mumbai', 'bangalore', 'delhi'].includes(data.location.toLowerCase()) ? 1 : 0,
      location_tier2: ['pune', 'hyderabad', 'chennai'].includes(data.location.toLowerCase()) ? 1 : 0,
      has_iso_certification: data.certifications.some(cert => cert.toLowerCase().includes('iso')) ? 1 : 0,
      risk_factor_count: data.riskFactors.length,
    };
  }

  private formatMLResult(businessData: BusinessData, mlResult: MLPrediction): ValuationResult {
    const breakdown = this.calculateBreakdown(businessData, mlResult.valuation);
    const riskScore = this.calculateRiskScore(businessData);
    const recommendations = this.generateRecommendations(businessData, mlResult);

    return {
      valuation: Math.round(mlResult.valuation),
      confidence: mlResult.confidence,
      methodology: 'ml',
      breakdown,
      riskScore,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }

  private async heuristicValuation(businessData: BusinessData): Promise<ValuationResult> {
    const {
      revenue,
      profit,
      assets,
      employees,
      industry,
      location,
      growthRate,
      debtToEquity,
      currentRatio,
    } = businessData;

    // Enhanced industry multipliers
    const industryMultipliers = {
      'technology': 12.0,
      'healthcare': 9.5,
      'finance': 8.0,
      'manufacturing': 6.5,
      'retail': 5.0,
      'services': 5.5,
      'agriculture': 4.0,
      'general': 4.5,
    };

    // Location multipliers
    const locationMultipliers = {
      'mumbai': 1.4,
      'bangalore': 1.35,
      'delhi': 1.3,
      'hyderabad': 1.2,
      'pune': 1.15,
      'chennai': 1.15,
      'kolkata': 1.1,
      'ahmedabad': 1.1,
      'unknown': 1.0,
    };

    // Growth adjustment
    const growthAdjustment = Math.max(0.8, Math.min(1.5, 1 + (growthRate / 100)));

    // Financial health adjustment
    const debtAdjustment = Math.max(0.7, Math.min(1.2, 1 - (debtToEquity / 10)));
    const liquidityAdjustment = Math.max(0.8, Math.min(1.3, currentRatio / 2));

    const industryMultiplier = industryMultipliers[industry.toLowerCase()] || 4.5;
    const locationMultiplier = locationMultipliers[location.toLowerCase()] || 1.0;

    // Multiple valuation approaches
    const revenueMultiple = revenue * industryMultiplier;
    const profitMultiple = profit * 18; // Higher multiple for profit
    const assetValue = assets * 0.85;
    const employeeValue = employees * 75000; // Increased employee value

    // Weighted average with adjustments
    const baseValuation = (
      revenueMultiple * 0.35 +
      profitMultiple * 0.35 +
      assetValue * 0.20 +
      employeeValue * 0.10
    );

    const adjustedValuation = baseValuation *
      locationMultiplier *
      growthAdjustment *
      debtAdjustment *
      liquidityAdjustment;

    const breakdown = {
      assetValue: Math.round(assetValue),
      earningsMultiple: Math.round(profitMultiple),
      marketAdjustment: Math.round(baseValuation * locationMultiplier),
      riskAdjustment: Math.round(adjustedValuation - baseValuation),
    };

    const riskScore = this.calculateRiskScore(businessData);
    const recommendations = this.generateHeuristicRecommendations(businessData);

    return {
      valuation: Math.round(adjustedValuation),
      confidence: 0.75, // Moderate confidence for heuristic
      methodology: 'heuristic',
      breakdown,
      riskScore,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }

  private hybridValuation(
    businessData: BusinessData,
    mlResult: MLPrediction,
    heuristicResult: ValuationResult,
  ): ValuationResult {
    const mlWeight = mlResult.confidence;
    const heuristicWeight = 1 - mlWeight;

    const hybridValuation = (
      mlResult.valuation * mlWeight +
      heuristicResult.valuation * heuristicWeight
    );

    const breakdown = {
      assetValue: Math.round(heuristicResult.breakdown.assetValue),
      earningsMultiple: Math.round(heuristicResult.breakdown.earningsMultiple),
      marketAdjustment: Math.round(mlResult.valuation * 0.3),
      riskAdjustment: Math.round(heuristicResult.breakdown.riskAdjustment),
    };

    const riskScore = this.calculateRiskScore(businessData);
    const recommendations = [
      ...this.generateRecommendations(businessData, mlResult),
      ...heuristicResult.recommendations,
    ].slice(0, 5); // Top 5 recommendations

    return {
      valuation: Math.round(hybridValuation),
      confidence: (mlResult.confidence + heuristicResult.confidence) / 2,
      methodology: 'hybrid',
      breakdown,
      riskScore,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }

  private calculateBreakdown(businessData: BusinessData, totalValuation: number) {
    return {
      assetValue: Math.round(totalValuation * 0.3),
      earningsMultiple: Math.round(totalValuation * 0.4),
      marketAdjustment: Math.round(totalValuation * 0.2),
      riskAdjustment: Math.round(totalValuation * 0.1),
    };
  }

  private calculateRiskScore(businessData: BusinessData): number {
    let riskScore = 0;

    // Financial risk factors
    if (businessData.debtToEquity > 2) {riskScore += 15;}
    if (businessData.currentRatio < 1) {riskScore += 10;}
    if (businessData.profit < 0) {riskScore += 20;}
    if (businessData.growthRate < 0) {riskScore += 15;}

    // Business risk factors
    const businessAge = new Date().getFullYear() - businessData.yearEstablished;
    if (businessAge < 3) {riskScore += 10;}
    if (businessData.marketShare < 5) {riskScore += 8;}
    if (businessData.customerRetention < 70) {riskScore += 12;}

    // Industry and location risks
    if (businessData.industry === 'general') {riskScore += 5;}
    if (!['mumbai', 'bangalore', 'delhi'].includes(businessData.location.toLowerCase())) {
      riskScore += 5;
    }

    // Additional risk factors
    riskScore += businessData.riskFactors.length * 3;

    return Math.min(100, Math.max(0, riskScore));
  }

  private generateRecommendations(businessData: BusinessData, mlResult: MLPrediction): string[] {
    const recommendations: string[] = [];

    // Feature importance based recommendations
    const topFeatures = Object.entries(mlResult.features_importance)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    topFeatures.forEach(([feature, importance]) => {
      if (feature === 'profit_margin' && importance > 0.1) {
        recommendations.push('Focus on improving profit margins through cost optimization');
      } else if (feature === 'growth_rate' && importance > 0.1) {
        recommendations.push('Maintain consistent growth rate to enhance valuation');
      } else if (feature === 'digital_presence' && importance > 0.1) {
        recommendations.push('Invest in digital transformation to increase market value');
      }
    });

    return recommendations;
  }

  private generateHeuristicRecommendations(businessData: BusinessData): string[] {
    const recommendations: string[] = [];

    if (businessData.debtToEquity > 1.5) {
      recommendations.push('Consider debt restructuring to improve financial health');
    }

    if (businessData.currentRatio < 1.2) {
      recommendations.push('Improve working capital management');
    }

    if (businessData.digitalPresence < 60) {
      recommendations.push('Enhance digital presence and online capabilities');
    }

    if (businessData.customerRetention < 80) {
      recommendations.push('Focus on customer retention strategies');
    }

    if (businessData.certifications.length < 2) {
      recommendations.push('Obtain relevant industry certifications');
    }

    return recommendations;
  }

  async getModelHealth(): Promise<{ healthy: boolean; version: string; lastUpdate: string }> {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/health`, {
        timeout: 3000,
        headers: { 'X-API-Key': process.env.ML_API_KEY },
      });

      return {
        healthy: response.data.status === 'healthy',
        version: response.data.model_version || this.modelVersion,
        lastUpdate: response.data.last_update || new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        version: this.modelVersion,
        lastUpdate: new Date().toISOString(),
      };
    }
  }

  async retrainModel(trainingData: BusinessData[]): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(`${this.mlServiceUrl}/retrain`, {
        training_data: trainingData,
        model_version: this.modelVersion,
      }, {
        timeout: 300000, // 5 minutes for training
        headers: { 'X-API-Key': process.env.ML_API_KEY },
      });

      return {
        success: true,
        message: `Model retrained successfully. New version: ${response.data.model_version}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Model retraining failed: ${error.message}`,
      };
    }
  }
}

export const mlValuationEngine = new MLValuationEngine();
export { ValuationResult, BusinessData };
