import { storage } from '../storage';
import { MsmeListing } from '@shared/schema';
import {
  GeographicMatchCriteria,
  GeographicMatchResult,
  getDistanceBetweenLocations,
  calculateProximityScore,
  isSameDistrict,
  formatDistance,
} from './geographic-proximity';

export interface MatchCriteria extends GeographicMatchCriteria {}

export interface MatchResult extends GeographicMatchResult {}

export async function findMatches(criteria: MatchCriteria): Promise<MatchResult[]> {
  // Get all active MSME listings
  const listings = await storage.getMsmeListings({ status: 'active' });

  const matches: MatchResult[] = [];

  for (const listing of listings) {
    const score = calculateMatchScore(listing, criteria);
    const reasons = getMatchReasons(listing, criteria);

    // Calculate distance and proximity score
    const distance = criteria.location ? getDistanceBetweenLocations(criteria.location, listing.city || '') : null;
    const proximityScore = calculateProximityScore(distance);

    // Apply distance filter if specified
    if (criteria.maxDistance && distance && distance > criteria.maxDistance) {
      continue;
    }

    // Apply same district preference if specified
    if (criteria.preferSameDistrict && criteria.location && !isSameDistrict(criteria.location, listing.city || '')) {
      continue;
    }

    // Enhanced scoring with geographic proximity
    const finalScore = score + (proximityScore * 0.2); // 20% weight to proximity

    if (finalScore > 0.3) { // Minimum threshold
      matches.push({
        msme: listing,
        score: finalScore,
        distance,
        proximityBonus: proximityScore * 0.2,
        reasons: [
          ...reasons,
          ...(distance ? [`Distance: ${formatDistance(distance)}`] : []),
          ...(proximityScore > 0.8 ? ['Very close location'] : []),
        ],
      });
    }
  }

  // Sort by final score descending, then by distance ascending
  return matches.sort((a, b) => {
    if (b.score !== a.score) {return b.score - a.score;}
    if (a.distance && b.distance) {return a.distance - b.distance;}
    return 0;
  });
}

function calculateMatchScore(listing: MsmeListing, criteria: MatchCriteria): number {
  let score = 0;
  let totalWeight = 0;

  // Industry match (weight: 30%)
  if (criteria.industry) {
    const weight = 0.3;
    totalWeight += weight;
    if (listing.industry?.toLowerCase().includes(criteria.industry.toLowerCase())) {
      score += weight;
    }
  }

  // Location match (weight: 20%)
  if (criteria.location) {
    const weight = 0.2;
    totalWeight += weight;
    if (listing.city?.toLowerCase().includes(criteria.location.toLowerCase()) ||
        listing.state?.toLowerCase().includes(criteria.location.toLowerCase())) {
      score += weight;
    }
  }

  // Price range match (weight: 25%)
  if (criteria.priceRange) {
    const weight = 0.25;
    totalWeight += weight;
    const askingPrice = Number(listing.askingPrice) || 0;

    if (isPriceInRange(askingPrice, criteria.priceRange)) {
      score += weight;
    }
  }

  // Revenue range match (weight: 15%)
  if (criteria.minRevenue || criteria.maxRevenue) {
    const weight = 0.15;
    totalWeight += weight;
    const revenue = Number(listing.annualTurnover) || 0;

    let revenueMatch = true;
    if (criteria.minRevenue && revenue < criteria.minRevenue) {
      revenueMatch = false;
    }
    if (criteria.maxRevenue && revenue > criteria.maxRevenue) {
      revenueMatch = false;
    }

    if (revenueMatch) {
      score += weight;
    }
  }

  // Employee range match (weight: 10%)
  if (criteria.employeeRange) {
    const weight = 0.1;
    totalWeight += weight;
    const employees = listing.employeeCount || 0;

    if (isEmployeeInRange(employees, criteria.employeeRange)) {
      score += weight;
    }
  }

  return totalWeight > 0 ? score / totalWeight : 0;
}

function getMatchReasons(listing: MsmeListing, criteria: MatchCriteria): string[] {
  const reasons: string[] = [];

  if (criteria.industry && listing.industry?.toLowerCase().includes(criteria.industry.toLowerCase())) {
    reasons.push(`Industry match: ${listing.industry}`);
  }

  if (criteria.location && (listing.city?.toLowerCase().includes(criteria.location.toLowerCase()) ||
      listing.state?.toLowerCase().includes(criteria.location.toLowerCase()))) {
    reasons.push(`Location match: ${listing.city}, ${listing.state}`);
  }

  if (criteria.priceRange && isPriceInRange(Number(listing.askingPrice) || 0, criteria.priceRange)) {
    reasons.push(`Price in range: ₹${listing.askingPrice} Cr`);
  }

  if (listing.isDistressed) {
    reasons.push('Distressed asset opportunity');
  }

  if (Number(listing.netProfit) > 0) {
    reasons.push(`Profitable: ₹${listing.netProfit} Cr net profit`);
  }

  if (listing.establishedYear && listing.establishedYear < 2015) {
    reasons.push('Established business (8+ years)');
  }

  return reasons;
}

function isPriceInRange(price: number, range: string): boolean {
  const ranges: Record<string, [number, number]> = {
    '0-1': [0, 1],
    '1-5': [1, 5],
    '5-10': [5, 10],
    '10-25': [10, 25],
    '25-50': [25, 50],
    '50+': [50, Infinity],
  };

  const [min, max] = ranges[range] || [0, Infinity];
  return price >= min && price <= max;
}

function isEmployeeInRange(employees: number, range: string): boolean {
  const ranges: Record<string, [number, number]> = {
    '1-10': [1, 10],
    '11-50': [11, 50],
    '51-100': [51, 100],
    '101-250': [101, 250],
    '250+': [250, Infinity],
  };

  const [min, max] = ranges[range] || [0, Infinity];
  return employees >= min && employees <= max;
}
