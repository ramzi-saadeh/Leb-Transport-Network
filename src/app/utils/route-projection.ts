export interface LatLng { lat: number; lng: number; }

/** Haversine distance in kilometres between two points */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Returns a 0-based index indicating which waypoint in the route the
 * given position is closest to.  Lower index = closer to route start.
 */
export function projectOntoRoute(
  lat: number,
  lng: number,
  waypoints: LatLng[],
): number {
  let bestIndex = 0;
  let bestDist = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const d = haversineKm({ lat, lng }, waypoints[i]);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/**
 * Returns true when the driver has NOT yet passed the passenger.
 * A 1-waypoint tolerance absorbs GPS inaccuracy near the same stop.
 */
export function driverNotPassedYet(
  driverIndex: number,
  passengerIndex: number,
): boolean {
  return driverIndex <= passengerIndex + 1;
}
