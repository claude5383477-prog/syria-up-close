import GEO from '@/content/places-geo.json'

export type LatLng = readonly [number, number]

const geo = GEO as Record<string, Record<string, number[]>>

/** A place's coordinates in a city, looked up by its Arabic name (content/places-geo.json). */
export function placePoint(citySlug: string, arName: string | null | undefined): LatLng | null {
  if (!arName) return null
  const p = geo[citySlug]?.[arName.trim()]
  const [lat, lng] = p ?? []
  return lat !== undefined && lng !== undefined ? [lat, lng] : null
}

/** Google Maps directions to a point, or a search for the name in the city when we have no point. */
export function mapLink(point: LatLng | null, name: string, cityName: string): string {
  if (point) return `https://www.google.com/maps/dir/?api=1&destination=${point[0]},${point[1]}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${cityName}`)}`
}

/** Great-circle distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const r = Math.PI / 180
  const x = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(x))
}

/** "650 m" / "1.2 km", rounded to what a walker cares about. */
export function distanceText(km: number, locale: 'ar' | 'en'): string {
  if (km < 1) {
    const m = Math.max(50, Math.round((km * 1000) / 50) * 50)
    return locale === 'ar' ? `${m} م` : `${m} m`
  }
  const v = km < 10 ? km.toFixed(1) : String(Math.round(km))
  return locale === 'ar' ? `${v} كم` : `${v} km`
}
