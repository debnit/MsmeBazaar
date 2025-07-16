// Advanced ML-powered matchmaking engine with buyer-seller matching
import axios from 'axios';
import { serverMemoryManager } from '../infrastructure/memory-management';

interface BuyerProfile {
  id: string;
  preferences: {
    industries: string[];
    minRevenue: number;
    maxRevenue: number;
    minValuation: number;
    maxValuation: number;
    preferredLocations: string[];
    maxEmployees?: number;
    minEmployees?: number;
    riskTolerance: 'low' | 'medium' | 'high';
    investmentHorizon: 'short' | 'medium' | 'long';
    requiredCertifications?: string[];
  };
  investmentCapacity: number;
  pastInvestments: string[];
  riskProfile: number;
  decisionSpeed: 'fast' | 'medium' | 'slow';
}

interface BusinessListing {
  id: string;
  name: string;
  industry: string;
  revenue: number;
  profit: number;
  valuation: number;
  location: string;
  employees: number;
  yearEstablished: number;
  growthRate: number;
  riskScore: number;
  certifications: string[];
  features: Record<string, number>;
}

interface MatchResult {
  businessId: string;
  businessName: string;
  matchScore: number;
  confidence: number;
  reasons: string[];
  riskAssessment: 'low' | 'medium' | 'high';
  recommendedAction: 'pursue' | 'consider' | 'pass';
}

interface MatchingResponse {
  matches: MatchResult[];
  totalMatches: number;
  confidence: number;
  methodology: 'ml' | 'heuristic' | 'hybrid';
  processingTime: number;
  recommendations: string[];
}

class MLMatchmakingEngine {
  private mlServiceUrl: string;
  private fallbackThreshold: number = 0.6;
  private modelVersion: string = '1.0.0';
  private isHealthy: boolean = true;

  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }

  async findMatches(
    buyerProfile: BuyerProfile,
    availableBusinesses: BusinessListing[],
    limit: number = 10
  ): Promise<MatchingResponse> {
    const startTime = Date.now();

    // Try ML-based matching first
    const mlResult = await this.tryMLMatching(buyerProfile, availableBusinesses);
    
    if (mlResult && mlResult.confidence >= this.fallbackThreshold) {
      return this.formatMLResult(mlResult, startTime);
    }

    // Fallback to enhanced heuristic matching
    console.log(`ML confidence ${mlResult?.confidence || 0} < ${this.fallbackThreshold}, using heuristic fallback`);
    const heuristicResult = await this.heuristicMatching(buyerProfile, availableBusinesses, limit);
    
    // Hybrid approach for moderate confidence
    if (mlResult && mlResult.confidence >= 0.4) {
      return this.hybridMatching(mlResult, heuristicResult, startTime);
    }

    return {
      ...heuristicResult,
      processingTime: Date.now() - startTime,
      methodology: 'heuristic'
    };
  }

  private async tryMLMatching(
    buyerProfile: BuyerProfile,
    businesses: BusinessListing[]
  ): Promise<any> {
    try {
      const requestData = {
        buyer_profile: this.extractBuyerFeatures(buyerProfile),
        businesses: businesses.map(b => this.extractBusinessFeatures(b)),
        model_version: this.modelVersion,
      };

      const response = await axios.post(`${this.mlServiceUrl}/predict/matchmaking`, requestData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ML_API_KEY}`,
        },
      });

      this.isHealthy = true;
      return response.data;
    } catch (error) {
      console.error('ML matchmaking failed:', error.message);
      this.isHealthy = false;
      return null;
    }
  }

  private extractBuyerFeatures(buyer: BuyerProfile): Record<string, number> {
    const prefs = buyer.preferences;
    
    return {
      investment_capacity: buyer.investmentCapacity,
      min_revenue: prefs.minRevenue,
      max_revenue: prefs.maxRevenue,
      min_valuation: prefs.minValuation,
      max_valuation: prefs.maxValuation,
      risk_tolerance: prefs.riskTolerance === 'low' ? 1 : prefs.riskTolerance === 'medium' ? 2 : 3,
      investment_horizon: prefs.investmentHorizon === 'short' ? 1 : prefs.investmentHorizon === 'medium' ? 2 : 3,
      decision_speed: buyer.decisionSpeed === 'fast' ? 3 : buyer.decisionSpeed === 'medium' ? 2 : 1,
      risk_profile: buyer.riskProfile,
      past_investments_count: buyer.pastInvestments.length,
      prefers_technology: prefs.industries.includes('technology') ? 1 : 0,
      prefers_healthcare: prefs.industries.includes('healthcare') ? 1 : 0,
      prefers_finance: prefs.industries.includes('finance') ? 1 : 0,
      prefers_manufacturing: prefs.industries.includes('manufacturing') ? 1 : 0,
      prefers_tier1_cities: prefs.preferredLocations.some(loc => 
        ['mumbai', 'bangalore', 'delhi'].includes(loc.toLowerCase())
      ) ? 1 : 0,
      requires_certifications: prefs.requiredCertifications?.length || 0,
      max_employees: prefs.maxEmployees || 1000,
      min_employees: prefs.minEmployees || 1,
    };
  }

  private extractBusinessFeatures(business: BusinessListing): Record<string, number> {
    const currentYear = new Date().getFullYear();
    const businessAge = currentYear - business.yearEstablished;
    
    return {
      business_id: parseInt(business.id) || 0,
      revenue: business.revenue,
      profit: business.profit,
      valuation: business.valuation,
      employees: business.employees,
      business_age: businessAge,
      growth_rate: business.growthRate,
      risk_score: business.riskScore,
      profit_margin: business.revenue > 0 ? (business.profit / business.revenue) * 100 : 0,
      revenue_per_employee: business.employees > 0 ? business.revenue / business.employees : 0,
      valuation_to_revenue: business.revenue > 0 ? business.valuation / business.revenue : 0,
      is_technology: business.industry === 'technology' ? 1 : 0,
      is_healthcare: business.industry === 'healthcare' ? 1 : 0,
      is_finance: business.industry === 'finance' ? 1 : 0,
      is_manufacturing: business.industry === 'manufacturing' ? 1 : 0,
      is_tier1_city: ['mumbai', 'bangalore', 'delhi'].includes(business.location.toLowerCase()) ? 1 : 0,
      is_tier2_city: ['pune', 'hyderabad', 'chennai'].includes(business.location.toLowerCase()) ? 1 : 0,
      certification_count: business.certifications.length,
      has_iso_certification: business.certifications.some(cert => 
        cert.toLowerCase().includes('iso')
      ) ? 1 : 0,
    };
  }

  private async heuristicMatching(
    buyerProfile: BuyerProfile,
    businesses: BusinessListing[],
    limit: number
  ): Promise<MatchingResponse> {
    const matches: MatchResult[] = [];
    const prefs = buyerProfile.preferences;

    for (const business of businesses) {
      const matchScore = this.calculateHeuristicScore(buyerProfile, business);
      
      if (matchScore > 0.3) { // Minimum threshold
        const match: MatchResult = {
          businessId: business.id,
          businessName: business.name,
          matchScore,
          confidence: 0.8, // Heuristic confidence
          reasons: this.generateMatchReasons(buyerProfile, business, matchScore),
          riskAssessment: this.assessRisk(business, buyerProfile.preferences.riskTolerance),
          recommendedAction: this.getRecommendedAction(matchScore, business.riskScore)
        };
        
        matches.push(match);
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return {
      matches: matches.slice(0, limit),
      totalMatches: matches.length,
      confidence: 0.8,
      methodology: 'heuristic',
      processingTime: 0,
      recommendations: this.generateRecommendations(buyerProfile, matches.slice(0, limit))
    };
  }

  private calculateHeuristicScore(buyer: BuyerProfile, business: BusinessListing): number {
    let score = 0;
    const prefs = buyer.preferences;

    // Industry preference (25% weight)
    if (prefs.industries.includes(business.industry)) {
      score += 0.25;
    }

    // Revenue range (20% weight)
    if (business.revenue >= prefs.minRevenue && business.revenue <= prefs.maxRevenue) {
      score += 0.20;
    } else if (business.revenue < prefs.minRevenue) {
      score += 0.20 * (business.revenue / prefs.minRevenue);
    } else {
      score += 0.20 * (prefs.maxRevenue / business.revenue);
    }

    // Valuation range (15% weight)
    if (business.valuation >= prefs.minValuation && business.valuation <= prefs.maxValuation) {
      score += 0.15;
    } else if (business.valuation < prefs.minValuation) {
      score += 0.15 * (business.valuation / prefs.minValuation);
    } else {
      score += 0.15 * (prefs.maxValuation / business.valuation);
    }

    // Location preference (15% weight)
    if (prefs.preferredLocations.includes(business.location)) {
      score += 0.15;
    }

    // Employee count (10% weight)
    if (prefs.maxEmployees && business.employees <= prefs.maxEmployees) {
      score += 0.10;
    }
    if (prefs.minEmployees && business.employees >= prefs.minEmployees) {
      score += 0.05;
    }

    // Risk tolerance (10% weight)
    const riskScore = this.normalizeRiskScore(business.riskScore);
    const riskTolerance = prefs.riskTolerance === 'low' ? 0.3 : 
                         prefs.riskTolerance === 'medium' ? 0.6 : 0.9;
    
    if (riskScore <= riskTolerance) {
      score += 0.10;
    } else {
      score += 0.10 * (riskTolerance / riskScore);
    }

    // Growth rate bonus (5% weight)
    if (business.growthRate > 10) {
      score += 0.05;
    }

    return Math.min(1, Math.max(0, score));
  }

  private normalizeRiskScore(riskScore: number): number {
    // Normalize risk score to 0-1 range
    return Math.min(1, Math.max(0, riskScore / 100));
  }

  private generateMatchReasons(buyer: BuyerProfile, business: BusinessListing, score: number): string[] {
    const reasons: string[] = [];
    const prefs = buyer.preferences;

    if (prefs.industries.includes(business.industry)) {
      reasons.push(`Matches preferred industry: ${business.industry}`);
    }

    if (business.revenue >= prefs.minRevenue && business.revenue <= prefs.maxRevenue) {
      reasons.push(`Revenue within target range: ₹${business.revenue.toLocaleString()}`);
    }

    if (business.valuation <= prefs.maxValuation) {
      reasons.push(`Valuation within budget: ₹${business.valuation.toLocaleString()}`);
    }

    if (prefs.preferredLocations.includes(business.location)) {
      reasons.push(`Located in preferred city: ${business.location}`);
    }

    if (business.growthRate > 15) {
      reasons.push(`Strong growth rate: ${business.growthRate}%`);
    }

    if (business.riskScore < 30) {
      reasons.push('Low risk profile');
    }

    if (business.certifications.length > 0) {
      reasons.push(`Quality certifications: ${business.certifications.join(', ')}`);
    }

    return reasons;
  }

  private assessRisk(business: BusinessListing, riskTolerance: string): 'low' | 'medium' | 'high' {
    if (business.riskScore < 30) return 'low';
    if (business.riskScore < 60) return 'medium';
    return 'high';
  }

  private getRecommendedAction(matchScore: number, riskScore: number): 'pursue' | 'consider' | 'pass' {
    if (matchScore > 0.8 && riskScore < 40) return 'pursue';
    if (matchScore > 0.6 && riskScore < 60) return 'consider';
    return 'pass';
  }

  private generateRecommendations(buyer: BuyerProfile, matches: MatchResult[]): string[] {
    const recommendations: string[] = [];

    if (matches.length === 0) {
      recommendations.push('Consider broadening your search criteria');
      recommendations.push('Increase budget range or expand industry preferences');
    } else if (matches.length > 0) {
      const avgScore = matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length;
      
      if (avgScore > 0.8) {
        recommendations.push('Excellent matches found - consider scheduling due diligence');
      } else if (avgScore > 0.6) {
        recommendations.push('Good matches available - recommend detailed evaluation');
      } else {
        recommendations.push('Moderate matches - consider adjusting criteria');
      }

      // Industry-specific recommendations
      const topIndustries = matches.reduce((acc, match) => {
        const business = match.businessName;
        // This would need actual industry data
        return acc;
      }, {});

      if (matches.some(m => m.riskAssessment === 'low')) {
        recommendations.push('Several low-risk opportunities identified');
      }

      if (matches.some(m => m.recommendedAction === 'pursue')) {
        recommendations.push('High-priority matches require immediate attention');
      }
    }

    return recommendations;
  }

  private formatMLResult(mlResult: any, startTime: number): MatchingResponse {
    return {
      matches: mlResult.matches.map((match: any) => ({
        businessId: match.business_id,
        businessName: match.business_name,
        matchScore: match.match_score,
        confidence: match.confidence,
        reasons: match.reasons || [],
        riskAssessment: match.risk_assessment,
        recommendedAction: match.recommended_action
      })),
      totalMatches: mlResult.matches.length,
      confidence: mlResult.confidence,
      methodology: 'ml',
      processingTime: Date.now() - startTime,
      recommendations: mlResult.recommendations || []
    };
  }

  private hybridMatching(mlResult: any, heuristicResult: MatchingResponse, startTime: number): MatchingResponse {
    // Combine ML and heuristic results
    const hybridMatches: MatchResult[] = [];
    
    // Merge matches by business ID
    const businessMap = new Map<string, MatchResult>();
    
    // Add ML matches
    mlResult.matches.forEach((match: any) => {
      businessMap.set(match.business_id, {
        businessId: match.business_id,
        businessName: match.business_name,
        matchScore: match.match_score * 0.6, // Weight ML result
        confidence: match.confidence,
        reasons: match.reasons || [],
        riskAssessment: match.risk_assessment,
        recommendedAction: match.recommended_action
      });
    });

    // Add heuristic matches
    heuristicResult.matches.forEach(match => {
      const existing = businessMap.get(match.businessId);
      if (existing) {
        // Combine scores
        existing.matchScore = (existing.matchScore + match.matchScore * 0.4);
        existing.confidence = (existing.confidence + match.confidence) / 2;
        existing.reasons = [...existing.reasons, ...match.reasons];
      } else {
        businessMap.set(match.businessId, {
          ...match,
          matchScore: match.matchScore * 0.4 // Weight heuristic result
        });
      }
    });

    // Sort by combined score
    const sortedMatches = Array.from(businessMap.values())
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      matches: sortedMatches,
      totalMatches: sortedMatches.length,
      confidence: (mlResult.confidence + heuristicResult.confidence) / 2,
      methodology: 'hybrid',
      processingTime: Date.now() - startTime,
      recommendations: [
        ...mlResult.recommendations || [],
        ...heuristicResult.recommendations
      ].slice(0, 5)
    };
  }

  async getMatchingHistory(buyerId: string): Promise<any[]> {
    // Retrieve matching history from cache
    const historyKey = `matching_history:${buyerId}`;
    const cachedHistory = await serverMemoryManager.loadPage(
      historyKey,
      () => Promise.resolve([]),
      'medium'
    );
    
    return cachedHistory;
  }

  async saveMatchingResult(buyerId: string, result: MatchingResponse): Promise<void> {
    const historyKey = `matching_history:${buyerId}`;
    const timestamp = new Date().toISOString();
    
    const historyEntry = {
      timestamp,
      matches: result.matches.length,
      confidence: result.confidence,
      methodology: result.methodology,
      topMatch: result.matches[0]?.businessName || null
    };

    // Save to cache
    await serverMemoryManager.loadPage(
      historyKey,
      async () => {
        const existing = await this.getMatchingHistory(buyerId);
        return [...existing, historyEntry].slice(-50); // Keep last 50 entries
      },
      'high'
    );
  }

  async getModelHealth(): Promise<{ healthy: boolean; version: string; lastUpdate: string }> {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/health`, {
        timeout: 3000,
        headers: { 'Authorization': `Bearer ${process.env.ML_API_KEY}` },
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
}

export const mlMatchmakingEngine = new MLMatchmakingEngine();
export { BuyerProfile, BusinessListing, MatchResult, MatchingResponse };