// Valuation engine utilities for frontend
export interface ValuationResult {
  estimatedValue: number;
  confidence: number;
  factors: {
    revenue: number;
    assets: number;
    market: number;
    location: number;
  };
}

export interface ValuationRequest {
  revenue: number;
  assets: number;
  industry: string;
  location: string;
  age: number;
}

export function calculateValuation(data: ValuationRequest): ValuationResult {
  // Simple valuation calculation for frontend display
  const baseValue = data.revenue * 2.5 + data.assets * 0.8;
  const industryMultiplier = getIndustryMultiplier(data.industry);
  const locationMultiplier = getLocationMultiplier(data.location);
  const ageMultiplier = getAgeMultiplier(data.age);

  const estimatedValue = baseValue * industryMultiplier * locationMultiplier * ageMultiplier;

  return {
    estimatedValue: Math.round(estimatedValue),
    confidence: 0.75,
    factors: {
      revenue: data.revenue * 2.5,
      assets: data.assets * 0.8,
      market: industryMultiplier,
      location: locationMultiplier,
    },
  };
}

function getIndustryMultiplier(industry: string): number {
  const multipliers: Record<string, number> = {
    'technology': 1.5,
    'manufacturing': 1.2,
    'retail': 1.0,
    'services': 1.1,
    'healthcare': 1.3,
    'default': 1.0,
  };

  return multipliers[industry.toLowerCase()] || multipliers.default;
}

function getLocationMultiplier(location: string): number {
  const multipliers: Record<string, number> = {
    'mumbai': 1.2,
    'delhi': 1.2,
    'bangalore': 1.15,
    'hyderabad': 1.1,
    'pune': 1.1,
    'default': 1.0,
  };

  return multipliers[location.toLowerCase()] || multipliers.default;
}

function getAgeMultiplier(age: number): number {
  if (age < 1) {return 0.8;}
  if (age < 3) {return 0.9;}
  if (age < 5) {return 1.0;}
  if (age < 10) {return 1.1;}
  return 1.0;
}
