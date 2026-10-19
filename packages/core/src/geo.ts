/**
 * Distancias para «Cerca de mí».
 * La ciudad del piloto es Cúcuta: si la persona está lejos (o no comparte su ubicación),
 * las distancias se miden desde el centro de la ciudad.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export const CITY = {
  name: 'Cúcuta',
  /** Parque Santander. */
  center: { lat: 7.8833, lng: -72.5052 } as LatLng,
  /** Más allá de este radio la ubicación del teléfono no sirve para ordenar. */
  radiusKm: 25,
} as const;

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia en línea recta (fórmula de haversine), en kilómetros. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 0.35 → "350 m", 1.24 → "1,2 km", 12.6 → "13 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/**
 * Punto desde el que se miden las distancias: la ubicación de la persona si está en la ciudad,
 * o el centro de la ciudad si no hay ubicación o está lejos.
 */
export function referencePoint(user: LatLng | null): { point: LatLng; fromUser: boolean } {
  if (user && distanceKm(user, CITY.center) <= CITY.radiusKm) return { point: user, fromUser: true };
  return { point: CITY.center, fromUser: false };
}
