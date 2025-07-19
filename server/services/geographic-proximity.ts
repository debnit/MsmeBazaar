import { MsmeListing } from '@shared/schema';

// Geographic coordinates for major Odisha cities/districts
export const odishaCoordinates: { [key: string]: { lat: number; lng: number } } = {
  'Angul': { lat: 20.8400, lng: 85.1014 },
  'Balangir': { lat: 20.7109, lng: 83.4959 },
  'Balasore': { lat: 21.4942, lng: 86.9336 },
  'Bargarh': { lat: 21.3344, lng: 83.6186 },
  'Bhadrak': { lat: 21.0576, lng: 86.5106 },
  'Boudh': { lat: 20.8350, lng: 84.3300 },
  'Cuttack': { lat: 20.4625, lng: 85.8828 },
  'Deogarh': { lat: 21.5369, lng: 84.7338 },
  'Dhenkanal': { lat: 20.6586, lng: 85.5981 },
  'Gajapati': { lat: 18.7967, lng: 84.1500 },
  'Ganjam': { lat: 19.3919, lng: 84.8014 },
  'Jagatsinghpur': { lat: 20.2632, lng: 86.1713 },
  'Jajpur': { lat: 20.8507, lng: 86.3253 },
  'Jharsuguda': { lat: 21.8661, lng: 84.0067 },
  'Kalahandi': { lat: 20.0833, lng: 83.1667 },
  'Kandhamal': { lat: 20.1333, lng: 84.0500 },
  'Kendrapara': { lat: 20.5000, lng: 86.4217 },
  'Kendujhar': { lat: 21.6293, lng: 85.5914 },
  'Khordha': { lat: 20.1821, lng: 85.6186 },
  'Koraput': { lat: 18.8129, lng: 82.7108 },
  'Malkangiri': { lat: 18.3477, lng: 81.8839 },
  'Mayurbhanj': { lat: 21.9288, lng: 86.7409 },
  'Nabarangpur': { lat: 19.2333, lng: 82.5333 },
  'Nayagarh': { lat: 20.1295, lng: 85.0965 },
  'Nuapada': { lat: 20.8167, lng: 82.5333 },
  'Puri': { lat: 19.8135, lng: 85.8312 },
  'Rayagada': { lat: 19.1679, lng: 83.4136 },
  'Sambalpur': { lat: 21.4667, lng: 83.9833 },
  'Subarnapur': { lat: 20.8333, lng: 83.9000 },
  'Sundargarh': { lat: 22.1167, lng: 84.0167 },
};

// Function to calculate distance between two points using Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Get coordinates for a city/district
export function getCoordinates(location: string): { lat: number; lng: number } | null {
  const normalized = location.trim().toLowerCase();

  // Try exact match first
  for (const [city, coords] of Object.entries(odishaCoordinates)) {
    if (city.toLowerCase() === normalized) {
      return coords;
    }
  }

  // Try partial match
  for (const [city, coords] of Object.entries(odishaCoordinates)) {
    if (city.toLowerCase().includes(normalized) || normalized.includes(city.toLowerCase())) {
      return coords;
    }
  }

  return null;
}

// Calculate distance between two locations
export function getDistanceBetweenLocations(location1: string, location2: string): number | null {
  const coords1 = getCoordinates(location1);
  const coords2 = getCoordinates(location2);

  if (!coords1 || !coords2) {
    return null;
  }

  return calculateDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
}

// Enhanced match criteria with geographic proximity
export interface GeographicMatchCriteria {
  industry?: string;
  priceRange?: string;
  location?: string;
  maxDistance?: number; // in kilometers
  minRevenue?: number;
  maxRevenue?: number;
  employeeRange?: string;
  preferSameDistrict?: boolean;
}

// Enhanced match result with distance information
export interface GeographicMatchResult {
  msme: MsmeListing;
  score: number;
  distance?: number; // in kilometers
  reasons: string[];
  proximityBonus: number;
}

// Calculate proximity score based on distance
export function calculateProximityScore(distance: number | null): number {
  if (distance === null) {return 0;}

  // Proximity scoring:
  // 0-25 km: 1.0 (excellent)
  // 25-50 km: 0.8 (very good)
  // 50-100 km: 0.6 (good)
  // 100-200 km: 0.4 (fair)
  // 200+ km: 0.2 (poor)

  if (distance <= 25) {return 1.0;}
  if (distance <= 50) {return 0.8;}
  if (distance <= 100) {return 0.6;}
  if (distance <= 200) {return 0.4;}
  return 0.2;
}

// Check if two locations are in the same district
export function isSameDistrict(location1: string, location2: string): boolean {
  const normalized1 = location1.trim().toLowerCase();
  const normalized2 = location2.trim().toLowerCase();

  // Check if either location contains the other
  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}

// Get nearby districts for a given district
export function getNearbyDistricts(district: string, maxDistance: number = 100): string[] {
  const baseCoords = getCoordinates(district);
  if (!baseCoords) {return [];}

  const nearby: string[] = [];

  for (const [districtName, coords] of Object.entries(odishaCoordinates)) {
    if (districtName.toLowerCase() === district.toLowerCase()) {continue;}

    const distance = calculateDistance(baseCoords.lat, baseCoords.lng, coords.lat, coords.lng);
    if (distance <= maxDistance) {
      nearby.push(districtName);
    }
  }

  return nearby.sort((a, b) => {
    const distA = calculateDistance(baseCoords.lat, baseCoords.lng,
      odishaCoordinates[a].lat, odishaCoordinates[a].lng);
    const distB = calculateDistance(baseCoords.lat, baseCoords.lng,
      odishaCoordinates[b].lat, odishaCoordinates[b].lng);
    return distA - distB;
  });
}

// Format distance for display
export function formatDistance(distance: number | null, language: 'en' | 'hi' | 'or' = 'en'): string {
  if (distance === null) {return '';}

  const rounded = Math.round(distance);

  switch (language) {
  case 'hi':
    return `${rounded} किमी दूर`;
  case 'or':
    return `${rounded} କିମି ଦୂରରେ`;
  default:
    return `${rounded} km away`;
  }
}

// Geographic clustering for performance optimization
export function clusterByGeography(listings: MsmeListing[], clusterRadius: number = 50): MsmeListing[][] {
  const clusters: MsmeListing[][] = [];
  const processed = new Set<number>();

  for (const listing of listings) {
    if (processed.has(listing.id)) {continue;}

    const cluster: MsmeListing[] = [listing];
    processed.add(listing.id);

    const baseCoords = getCoordinates(listing.city || '');
    if (!baseCoords) {continue;}

    // Find nearby listings
    for (const otherListing of listings) {
      if (processed.has(otherListing.id)) {continue;}

      const otherCoords = getCoordinates(otherListing.city || '');
      if (!otherCoords) {continue;}

      const distance = calculateDistance(
        baseCoords.lat, baseCoords.lng,
        otherCoords.lat, otherCoords.lng,
      );

      if (distance <= clusterRadius) {
        cluster.push(otherListing);
        processed.add(otherListing.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}
