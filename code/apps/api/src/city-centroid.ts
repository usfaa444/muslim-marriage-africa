/** Static city centroids. Not a table, not a profile column, not a geocoder. */

const EARTH_KM = 6371.0088

export type CityCentroid = {
  city: string
  lat: number
  lng: number
}

export const CITY_CENTROID: readonly CityCentroid[] = [
  { city: 'ouagadougou', lat: 12.3714, lng: -1.5197 },
  { city: 'bobo', lat: 11.1771, lng: -4.2979 },
  { city: 'koudougou', lat: 12.2526, lng: -2.3627 },
  { city: 'ouahigouya', lat: 13.5828, lng: -2.4216 },
  { city: 'banfora', lat: 10.6333, lng: -4.7667 },
  { city: 'dedougou', lat: 12.4634, lng: -3.4608 },
  { city: 'fada', lat: 12.0614, lng: 0.3582 },
]

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function haversineKm(left: CityCentroid, right: CityCentroid): number {
  const dLat = toRadians(right.lat - left.lat)
  const dLng = toRadians(right.lng - left.lng)
  const lat1 = toRadians(left.lat)
  const lat2 = toRadians(right.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Tokens whose centroid is within `km` of `city`, always including `city` itself. */
export function citiesWithin(city: string, km: number): string[] {
  const origin = CITY_CENTROID.find((row) => row.city === city)
  if (!origin) {
    return []
  }
  return CITY_CENTROID.filter((row) => haversineKm(origin, row) <= km).map((row) => row.city)
}
