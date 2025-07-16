// server/ml/utils/geoUtils.ts

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculates the haversine distance (in kilometers) between two geo points.
 */
export function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Radius of Earth in km
  const dLat = degreesToRadians(coord2.lat - coord1.lat);
  const dLng = degreesToRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degreesToRadians(coord1.lat)) *
      Math.cos(degreesToRadians(coord2.lat)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
