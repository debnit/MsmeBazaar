import { MsmeListing } from "@shared/schema";

export interface ValuationResult {
  amount: number;
  confidence: number;
  factors: {
    revenueMultiple: number;
    assetValue: number;
    industryFactor: number;
    distressFactor: number;
    profitabilityFactor: number;
  };
  recommendation: string;
}

export async function validateValuation(msme: MsmeListing): Promise<ValuationResult> {
  // Mock ML-based valuation service
  // In a real implementation, this would call an ML model
  
  const revenue = Number(msme.annualTurnover) || 0;
  const netProfit = Number(msme.netProfit) || 0;
  const totalAssets = Number(msme.totalAssets) || 0;
  const totalLiabilities = Number(msme.totalLiabilities) || 0;
  
  // Industry-specific revenue multiples
  const industryMultiples: Record<string, number> = {
    "manufacturing": 1.5,
    "technology": 3.0,
    "healthcare": 2.5,
    "retail": 1.2,
    "services": 2.0,
    "default": 1.8
  };
  
  const industryMultiple = industryMultiples[msme.industry?.toLowerCase() || "default"] || 1.8;
  
  // Calculate valuation factors
  const revenueMultiple = revenue * industryMultiple;
  const assetValue = Math.max(0, totalAssets - totalLiabilities);
  
  // Industry factor (0.8 to 1.2)
  const industryFactor = Math.random() * 0.4 + 0.8;
  
  // Distress factor (0.6 to 1.0)
  const distressFactor = msme.isDistressed ? 0.6 + Math.random() * 0.4 : 1.0;
  
  // Profitability factor (0.7 to 1.3)
  const profitMargin = revenue > 0 ? netProfit / revenue : 0;
  const profitabilityFactor = Math.max(0.7, Math.min(1.3, 1.0 + profitMargin));
  
  // Calculate final valuation
  const baseValuation = Math.max(revenueMultiple, assetValue * 0.8);
  const finalValuation = baseValuation * industryFactor * distressFactor * profitabilityFactor;
  
  // Confidence score (0.6 to 0.95)
  const confidence = Math.min(0.95, 0.6 + 
    (revenue > 0 ? 0.1 : 0) +
    (netProfit > 0 ? 0.1 : 0) +
    (totalAssets > 0 ? 0.1 : 0) +
    (msme.establishedYear && msme.establishedYear < 2020 ? 0.05 : 0)
  );
  
  // Generate recommendation
  let recommendation = "Standard valuation";
  if (distressFactor < 0.8) {
    recommendation = "Distressed asset - consider discount";
  } else if (profitabilityFactor > 1.2) {
    recommendation = "High-growth opportunity";
  } else if (industryFactor > 1.1) {
    recommendation = "Favorable industry conditions";
  }
  
  return {
    amount: Math.round(finalValuation),
    confidence: Math.round(confidence * 100) / 100,
    factors: {
      revenueMultiple: Math.round(revenueMultiple),
      assetValue: Math.round(assetValue),
      industryFactor: Math.round(industryFactor * 100) / 100,
      distressFactor: Math.round(distressFactor * 100) / 100,
      profitabilityFactor: Math.round(profitabilityFactor * 100) / 100
    },
    recommendation
  };
}
