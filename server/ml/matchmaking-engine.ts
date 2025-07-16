import { MsmeListing, User, BuyerInterest } from '@shared/schema';
import { storage } from '../storage';

export interface MatchScore {
  buyerId: number;
  msmeId: number;
  totalScore: number;
  factors: {
    industryMatch: number;
    sizeMatch: number;
    budgetMatch: number;
    locationProximity: number;
    riskProfile: number;
    timelineMatch: number;
    strategicFit: number;
  };
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';
  reasoning: string[];
}

export interface BuyerPreferences {
  preferredIndustries: string[];
  budgetRange: { min: number; max: number };
  riskTolerance: 'low' | 'medium' | 'high';
  preferredLocations: string[];
  timelinePreference: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  strategicObjectives: string[];
}

// Coordinates for Odisha districts for geographic proximity calculation
const odishaCoordinates: Record<string, { lat: number; lng: number }> = {
  'Bhubaneswar': { lat: 20.2961, lng: 85.8245 },
  'Cuttack': { lat: 20.4625, lng: 85.8828 },
  'Rourkela': { lat: 22.2604, lng: 84.8536 },
  'Berhampur': { lat: 19.3149, lng: 84.7941 },
  'Sambalpur': { lat: 21.4669, lng: 83.9812 },
  'Balasore': { lat: 21.4942, lng: 86.9336 },
  'Baripada': { lat: 21.9347, lng: 86.7324 },
  'Bhadrak': { lat: 21.0543, lng: 86.5181 },
  'Jharsuguda': { lat: 21.8644, lng: 84.0067 },
  'Jeypore': { lat: 18.8557, lng: 82.5713 },
  'Puri': { lat: 19.8135, lng: 85.8312 },
  'Kendrapara': { lat: 20.5014, lng: 86.4231 },
  'Rayagada': { lat: 19.1728, lng: 83.4158 },
  'Koraput': { lat: 18.8120, lng: 82.7115 },
  'Angul': { lat: 20.8400, lng: 85.1018 },
  'Dhenkanal': { lat: 20.6593, lng: 85.5989 },
  'Jajpur': { lat: 20.8438, lng: 86.3318 },
  'Keonjhar': { lat: 21.6297, lng: 85.5828 },
  'Mayurbhanj': { lat: 22.1069, lng: 86.7441 },
  'Sundargarh': { lat: 22.1178, lng: 84.0328 },
  'Bolangir': { lat: 20.7117, lng: 83.4430 },
  'Kalahandi': { lat: 19.9147, lng: 83.1677 },
  'Kandhamal': { lat: 20.1333, lng: 84.0167 },
  'Nuapada': { lat: 20.8042, lng: 82.5397 },
  'Sonepur': { lat: 20.8333, lng: 83.9167 },
  'Boudh': { lat: 20.5347, lng: 84.3258 },
  'Debagarh': { lat: 21.5333, lng: 84.7333 },
  'Ganjam': { lat: 19.3858, lng: 84.8800 },
  'Gajapati': { lat: 18.7969, lng: 83.9183 },
  'Nayagarh': { lat: 20.1333, lng: 85.1000 }
};

export class MatchmakingEngine {
  private industryCompatibility: Record<string, Record<string, number>> = {
    'Manufacturing': {
      'Manufacturing': 1.0,
      'Technology': 0.7,
      'Healthcare': 0.6,
      'Retail': 0.5,
      'Services': 0.6,
      'Agriculture': 0.4,
      'Construction': 0.8,
      'Education': 0.3
    },
    'Technology': {
      'Technology': 1.0,
      'Manufacturing': 0.8,
      'Healthcare': 0.7,
      'Retail': 0.9,
      'Services': 0.8,
      'Agriculture': 0.6,
      'Construction': 0.5,
      'Education': 0.7
    },
    'Healthcare': {
      'Healthcare': 1.0,
      'Technology': 0.8,
      'Manufacturing': 0.6,
      'Retail': 0.5,
      'Services': 0.7,
      'Agriculture': 0.4,
      'Construction': 0.3,
      'Education': 0.6
    },
    'Retail': {
      'Retail': 1.0,
      'Technology': 0.8,
      'Manufacturing': 0.6,
      'Healthcare': 0.5,
      'Services': 0.7,
      'Agriculture': 0.7,
      'Construction': 0.4,
      'Education': 0.5
    },
    'Services': {
      'Services': 1.0,
      'Technology': 0.8,
      'Manufacturing': 0.7,
      'Healthcare': 0.8,
      'Retail': 0.7,
      'Agriculture': 0.6,
      'Construction': 0.7,
      'Education': 0.8
    },
    'Agriculture': {
      'Agriculture': 1.0,
      'Manufacturing': 0.7,
      'Technology': 0.6,
      'Healthcare': 0.4,
      'Retail': 0.8,
      'Services': 0.6,
      'Construction': 0.5,
      'Education': 0.4
    },
    'Construction': {
      'Construction': 1.0,
      'Manufacturing': 0.8,
      'Technology': 0.5,
      'Healthcare': 0.3,
      'Retail': 0.4,
      'Services': 0.7,
      'Agriculture': 0.5,
      'Education': 0.4
    },
    'Education': {
      'Education': 1.0,
      'Technology': 0.7,
      'Healthcare': 0.6,
      'Services': 0.8,
      'Manufacturing': 0.4,
      'Retail': 0.5,
      'Agriculture': 0.4,
      'Construction': 0.3
    }
  };

  async findMatches(msmeId: number, limit: number = 10): Promise<MatchScore[]> {
    const listing = await storage.getMsmeListing(msmeId);
    if (!listing) {
      throw new Error('MSME listing not found');
    }

    // Get all potential buyers (users with buyer role)
    const potentialBuyers = await this.getPotentialBuyers();
    
    const matches: MatchScore[] = [];

    for (const buyer of potentialBuyers) {
      const buyerPreferences = await this.getBuyerPreferences(buyer.id);
      const score = this.calculateMatchScore(listing, buyer, buyerPreferences);
      matches.push(score);
    }

    // Sort by score and return top matches
    return matches
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  }

  async findMSMEsForBuyer(buyerId: number, limit: number = 10): Promise<MatchScore[]> {
    const buyer = await storage.getUser(buyerId);
    if (!buyer) {
      throw new Error('Buyer not found');
    }

    const buyerPreferences = await this.getBuyerPreferences(buyerId);
    const listings = await storage.getMsmeListings({ status: 'active' });
    
    const matches: MatchScore[] = [];

    for (const listing of listings) {
      const score = this.calculateMatchScore(listing, buyer, buyerPreferences);
      matches.push(score);
    }

    return matches
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  }

  private async getPotentialBuyers(): Promise<User[]> {
    // This would typically be a database query
    // For now, return empty array as placeholder
    return [];
  }

  private async getBuyerPreferences(buyerId: number): Promise<BuyerPreferences> {
    // This would typically fetch from database
    // For now, return default preferences
    return {
      preferredIndustries: ['Technology', 'Manufacturing'],
      budgetRange: { min: 1000000, max: 10000000 },
      riskTolerance: 'medium',
      preferredLocations: ['Bhubaneswar', 'Cuttack'],
      timelinePreference: 'medium_term',
      strategicObjectives: ['market_expansion', 'cost_reduction']
    };
  }

  private calculateMatchScore(listing: MsmeListing, buyer: User, preferences: BuyerPreferences): MatchScore {
    const factors = {
      industryMatch: this.calculateIndustryMatch(listing, preferences),
      sizeMatch: this.calculateSizeMatch(listing, preferences),
      budgetMatch: this.calculateBudgetMatch(listing, preferences),
      locationProximity: this.calculateLocationProximity(listing, buyer),
      riskProfile: this.calculateRiskProfile(listing, preferences),
      timelineMatch: this.calculateTimelineMatch(listing, preferences),
      strategicFit: this.calculateStrategicFit(listing, preferences)
    };

    // Weight the factors
    const weights = {
      industryMatch: 0.25,
      sizeMatch: 0.15,
      budgetMatch: 0.20,
      locationProximity: 0.15,
      riskProfile: 0.10,
      timelineMatch: 0.10,
      strategicFit: 0.05
    };

    const totalScore = Object.entries(factors).reduce((sum, [key, value]) => {
      return sum + value * weights[key as keyof typeof weights];
    }, 0);

    const recommendation = this.getRecommendation(totalScore);
    const reasoning = this.generateReasoning(factors, listing, preferences);

    return {
      buyerId: buyer.id,
      msmeId: listing.id,
      totalScore: Math.round(totalScore * 100),
      factors,
      recommendation,
      reasoning
    };
  }

  private calculateIndustryMatch(listing: MsmeListing, preferences: BuyerPreferences): number {
    const listingIndustry = listing.industry || 'Services';
    
    // Direct match
    if (preferences.preferredIndustries.includes(listingIndustry)) {
      return 1.0;
    }

    // Cross-industry compatibility
    let maxCompatibility = 0;
    for (const preferredIndustry of preferences.preferredIndustries) {
      const compatibility = this.industryCompatibility[preferredIndustry]?.[listingIndustry] || 0;
      maxCompatibility = Math.max(maxCompatibility, compatibility);
    }

    return maxCompatibility;
  }

  private calculateSizeMatch(listing: MsmeListing, preferences: BuyerPreferences): number {
    const revenue = Number(listing.annualTurnover) || 0;
    const employees = Number(listing.employees) || 0;
    
    // Size scoring based on revenue and employees
    let sizeScore = 0;
    
    // Revenue-based scoring
    if (revenue > 0) {
      if (revenue < 1000000) sizeScore += 0.3; // Micro
      else if (revenue < 10000000) sizeScore += 0.6; // Small
      else if (revenue < 100000000) sizeScore += 0.9; // Medium
      else sizeScore += 1.0; // Large
    }
    
    // Employee-based scoring
    if (employees > 0) {
      if (employees < 10) sizeScore += 0.2; // Micro
      else if (employees < 50) sizeScore += 0.4; // Small
      else if (employees < 250) sizeScore += 0.6; // Medium
      else sizeScore += 0.8; // Large
    }
    
    return Math.min(sizeScore, 1.0);
  }

  private calculateBudgetMatch(listing: MsmeListing, preferences: BuyerPreferences): number {
    const askingPrice = Number(listing.askingPrice) || 0;
    
    if (askingPrice === 0) return 0.5; // Neutral if no price
    
    const { min, max } = preferences.budgetRange;
    
    if (askingPrice >= min && askingPrice <= max) {
      return 1.0; // Perfect match
    }
    
    if (askingPrice < min) {
      // Below budget - could be good value
      return 0.8;
    }
    
    if (askingPrice > max) {
      // Above budget - penalize based on how much over
      const overageRatio = askingPrice / max;
      return Math.max(0, 1 - (overageRatio - 1) * 2);
    }
    
    return 0.5;
  }

  private calculateLocationProximity(listing: MsmeListing, buyer: User): number {
    const listingLocation = listing.city || 'Bhubaneswar';
    const buyerLocation = buyer.city || 'Bhubaneswar';
    
    const listingCoords = odishaCoordinates[listingLocation];
    const buyerCoords = odishaCoordinates[buyerLocation];
    
    if (!listingCoords || !buyerCoords) {
      return 0.5; // Neutral if coordinates not available
    }
    
    const distance = this.calculateHaversineDistance(
      listingCoords.lat, listingCoords.lng,
      buyerCoords.lat, buyerCoords.lng
    );
    
    // Scoring based on distance (km)
    if (distance <= 50) return 1.0;
    if (distance <= 100) return 0.8;
    if (distance <= 200) return 0.6;
    if (distance <= 300) return 0.4;
    return 0.2;
  }

  private calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateRiskProfile(listing: MsmeListing, preferences: BuyerPreferences): number {
    const revenue = Number(listing.annualTurnover) || 0;
    const profit = Number(listing.netProfit) || 0;
    const assets = Number(listing.totalAssets) || 0;
    const liabilities = Number(listing.totalLiabilities) || 0;
    
    // Calculate risk indicators
    const profitMargin = revenue > 0 ? profit / revenue : 0;
    const debtRatio = assets > 0 ? liabilities / assets : 0;
    const yearsInBusiness = new Date().getFullYear() - (listing.establishedYear || new Date().getFullYear());
    
    // Risk score (lower is riskier)
    let riskScore = 0.5;
    
    // Profitability
    if (profitMargin > 0.1) riskScore += 0.2;
    else if (profitMargin > 0.05) riskScore += 0.1;
    else if (profitMargin < 0) riskScore -= 0.2;
    
    // Leverage
    if (debtRatio < 0.3) riskScore += 0.1;
    else if (debtRatio > 0.7) riskScore -= 0.1;
    
    // Stability
    if (yearsInBusiness > 5) riskScore += 0.1;
    else if (yearsInBusiness < 2) riskScore -= 0.1;
    
    riskScore = Math.max(0, Math.min(1, riskScore));
    
    // Match with buyer's risk tolerance
    switch (preferences.riskTolerance) {
      case 'low':
        return riskScore > 0.7 ? 1.0 : riskScore;
      case 'medium':
        return riskScore > 0.4 ? 1.0 : riskScore * 1.5;
      case 'high':
        return 1.0; // High risk tolerance accepts all
      default:
        return riskScore;
    }
  }

  private calculateTimelineMatch(listing: MsmeListing, preferences: BuyerPreferences): number {
    const readiness = listing.readinessLevel || 'medium';
    const documentation = listing.documentationComplete || false;
    
    let timelineScore = 0;
    
    // Base score from readiness
    switch (readiness) {
      case 'high': timelineScore = 0.9; break;
      case 'medium': timelineScore = 0.6; break;
      case 'low': timelineScore = 0.3; break;
    }
    
    // Bonus for complete documentation
    if (documentation) timelineScore += 0.1;
    
    // Match with buyer's timeline preference
    switch (preferences.timelinePreference) {
      case 'immediate':
        return readiness === 'high' ? 1.0 : timelineScore * 0.5;
      case 'short_term':
        return readiness === 'high' ? 1.0 : timelineScore * 0.8;
      case 'medium_term':
        return timelineScore;
      case 'long_term':
        return Math.min(timelineScore + 0.2, 1.0);
      default:
        return timelineScore;
    }
  }

  private calculateStrategicFit(listing: MsmeListing, preferences: BuyerPreferences): number {
    // This is a simplified strategic fit calculation
    // In a real system, this would involve more complex analysis
    
    const competitiveAdvantages = listing.competitiveAdvantage?.split(',') || [];
    const marketPosition = Number(listing.marketShare) || 0;
    const growth = Number(listing.revenueGrowth) || 0;
    
    let strategicScore = 0.5;
    
    // Market position
    if (marketPosition > 0.1) strategicScore += 0.2;
    else if (marketPosition > 0.05) strategicScore += 0.1;
    
    // Growth
    if (growth > 0.15) strategicScore += 0.2;
    else if (growth > 0.05) strategicScore += 0.1;
    
    // Competitive advantages
    strategicScore += Math.min(competitiveAdvantages.length * 0.05, 0.3);
    
    return Math.min(strategicScore, 1.0);
  }

  private getRecommendation(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'poor';
  }

  private generateReasoning(factors: any, listing: MsmeListing, preferences: BuyerPreferences): string[] {
    const reasoning: string[] = [];
    
    if (factors.industryMatch > 0.8) {
      reasoning.push(`Strong industry alignment with ${listing.industry}`);
    }
    
    if (factors.budgetMatch > 0.8) {
      reasoning.push('Asking price fits within budget range');
    }
    
    if (factors.locationProximity > 0.8) {
      reasoning.push('Located in preferred geographic area');
    }
    
    if (factors.riskProfile > 0.7) {
      reasoning.push('Risk profile matches tolerance level');
    }
    
    if (factors.timelineMatch > 0.7) {
      reasoning.push('Timeline aligns with acquisition schedule');
    }
    
    if (reasoning.length === 0) {
      reasoning.push('Mixed alignment across evaluation criteria');
    }
    
    return reasoning;
  }

  async updateBuyerPreferences(buyerId: number, preferences: Partial<BuyerPreferences>): Promise<void> {
    // This would typically update the database
    // For now, this is a placeholder
  }

  async getMatchHistory(buyerId: number): Promise<MatchScore[]> {
    // This would typically fetch from database
    // For now, return empty array
    return [];
  }
}

export const matchmakingEngine = new MatchmakingEngine();