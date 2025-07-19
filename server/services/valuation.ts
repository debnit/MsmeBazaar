export interface MSMEProfile {
  turnover: number; // ₹ (e.g., 5,00,000)
  assetsValue: number; // ₹
  employees: number; // headcount
  yearsActive: number;
  sector: string;
}

export interface BuyerCriteria {
  sector: string;
  minTurnover: number;
  assetRange: [number, number]; // [min, max]
  minYears: number;
}

/**
 * Calculate an MSME valuation score out of 100
 */
export function calculateValuation(msme: MSMEProfile): number {
  const score =
    normalize(msme.turnover, 100000, 10000000) * 0.4 +
    normalize(msme.assetsValue, 50000, 5000000) * 0.3 +
    normalize(msme.employees, 1, 100) * 0.2 +
    normalize(msme.yearsActive, 1, 20) * 0.1;

  return Math.round(score);
}

/**
 * Calculate match score between MSME and Buyer (out of 100)
 */
export function calculateMatchScore(
  msme: MSMEProfile,
  buyer: BuyerCriteria,
): number {
  let score = 0;

  if (msme.sector === buyer.sector) {score += 40;}
  if (msme.turnover >= buyer.minTurnover) {score += 20;}
  if (
    msme.assetsValue >= buyer.assetRange[0] &&
    msme.assetsValue <= buyer.assetRange[1]
  )
  {score += 20;}
  if (msme.yearsActive >= buyer.minYears) {score += 20;}

  return score;
}

/**
 * Normalization helper (maps a value to 0–100)
 */
function normalize(value: number, min: number, max: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  return ((clamped - min) / (max - min)) * 100;
}
//applied ml logic
