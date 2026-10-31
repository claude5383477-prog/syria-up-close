import { CITY_COORDS } from '@/lib/geo'
import { distanceKm, placePoint, type LatLng } from '@/lib/maplinks'

/**
 * Coordinates for places editors add (owner request 2026-10-27: "the maps should update by
 * themselves with every addition"). In order: a point the editor typed or a map link they pasted,
 * then our own reviewed list (content/places-geo.json), then OpenStreetMap's Nominatim search for the
 * name inside the city. A result is used only when it lies within the city's radius and its name
 * matches, so a wrong pin is never added; with nothing found the place keeps its search link.
 */

/** Syria's bounding box, with a little margin. */
const SYRIA = { south: 32.2, north: 37.4, west: 35.5, east: 42.5 }
const MAIN_RADIUS_KM = 25
const RESORT_RADIUS_KM = 12
const MAIN = new Set(['damascus', 'aleppo', 'latakia', 'homs', 'hama', 'tartous', 'idlib', 'daraa', 'suwayda', 'quneitra', 'raqqa', 'deir-ez-zor', 'hasakah'])

export const inSyria = ([lat, lng]: LatLng): boolean => lat >= SYRIA.south && lat <= SYRIA.north && lng >= SYRIA.west && lng <= SYRIA.east

export const cityRadiusKm = (slug: string): number => (MAIN.has(slug) ? MAIN_RADIUS_KM : RESORT_RADIUS_KM)

/** True when the point is inside the city's radius (any point in Syria for a city we have no centre for). */
export function nearCity(point: LatLng, slug: string, scale = 1): boolean {
  if (!inSyria(point)) return false
  const c = CITY_COORDS[slug]
  return c ? distanceKm(point, c) <= cityRadiusKm(slug) * scale : true
}

const STOP = /^(مطعم|مقهى|كافيه|كافتيريا|فندق|نزل|منتجع|حلويات|حديقة|منتزه|مجمع|استراحة|restaurant|cafe|café|hotel|resort|sweets|park)\s+/iu

/** A name reduced for comparison: no diacritics, one alef, no "ال", no "مطعم/فندق…" prefix. */
export function normName(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(STOP, '')
    .replace(/(^| )ال/g, '$1')
    .trim()
}

/** True when two names are the same place name once normalised (or one fully contains the other). */
export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normName(a)
  const y = normName(b)
  if (x.length < 3 || y.length < 3) return false
  return x === y || (x.length >= 5 && y.includes(x)) || (y.length >= 5 && x.includes(y))
}

/** "33.51, 36.30" or a Google Maps / OpenStreetMap link → a point, or null. */
export function parsePoint(input: string | null | undefined): LatLng | null {
  const s = (input ?? '').trim()
  if (!s) return null
  const patterns = [
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, // google.com/maps/place/…/@33.5,36.3,17z
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // google data=…!3d33.5!4d36.3
    /[?&](?:q|query|destination|ll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // ?q=33.5,36.3
    /[#?&]map=\d+\/(-?\d{1,2}\.\d+)\/(-?\d{1,3}\.\d+)/, // openstreetmap.org/#map=17/33.5/36.3
    /[?&]mlat=(-?\d{1,2}\.\d+)&mlon=(-?\d{1,3}\.\d+)/, // openstreetmap.org/?mlat=…&mlon=…
    /^(-?\d{1,2}\.\d+)\s*[,،]\s*(-?\d{1,3}\.\d+)$/, // plain "33.5, 36.3"
  ]
  for (const re of patterns) {
    const m = s.match(re)
    if (m) {
      const p: LatLng = [Number(m[1]), Number(m[2])]
      return inSyria(p) ? p : null
    }
  }
  return null
}

export type NominatimHit = { lat: string; lon: string; name?: string; display_name?: string }
export type Fetcher = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

const UA = 'SyriaUpClose/1.0 (https://upclosesyria.com; admin geocoding)'

/** The first Nominatim result named like the place and inside the city, or null. */
export function pickHit(hits: unknown, name: string, altName: string | null | undefined, slug: string): LatLng | null {
  if (!Array.isArray(hits)) return null
  for (const h of hits as NominatimHit[]) {
    const p: LatLng = [Number(h.lat), Number(h.lon)]
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1]) || !nearCity(p, slug)) continue
    const label = h.name || h.display_name?.split(',')[0]
    if (sameName(label, name) || sameName(label, altName)) return p
  }
  return null
}

/** Wikidata's own label or alias that matched, for a result named like the place. */
type WdHit = { id: string; label?: string; match?: { text?: string } }

/**
 * Wikidata's coordinates (P625) for a landmark of that name (owner, 2026-10-29: city maps still missing
 * most pins, OpenStreetMap barely knows them). Castles, lakes and mountains sit outside the town, so the
 * radius here is twice the city's; the name must still match one of the item's labels or aliases.
 */
export async function wikidataPoint(name: string, altName: string | null | undefined, slug: string, fetcher: Fetcher): Promise<LatLng | null> {
  const api = 'https://www.wikidata.org/w/api.php?'
  const get = async (params: Record<string, string>) => {
    const res = await fetcher(api + new URLSearchParams({ format: 'json', ...params }), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) })
    return res.ok ? ((await res.json()) as Record<string, unknown>) : {}
  }
  for (const [q, lang] of [[name, 'ar'], [altName ?? '', 'en']] as const) {
    if (q.trim().length < 3) continue
    try {
      const found = ((await get({ action: 'wbsearchentities', search: q, language: lang, type: 'item', limit: '7' })).search ?? []) as WdHit[]
      const ids = found.filter((h) => [h.match?.text, h.label].some((l) => sameName(l, name) || sameName(l, altName))).map((h) => h.id)
      if (!ids.length) continue
      const entities = ((await get({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims' })).entities ?? {}) as Record<string, { claims?: { P625?: { mainsnak?: { datavalue?: { value?: { latitude?: number; longitude?: number } } } }[] } }>
      for (const id of ids) {
        const v = entities[id]?.claims?.P625?.[0]?.mainsnak?.datavalue?.value
        const p: LatLng | null = v?.latitude != null && v.longitude != null ? [Number(v.latitude.toFixed(5)), Number(v.longitude.toFixed(5))] : null
        if (p && nearCity(p, slug, 2)) return p
      }
    } catch {
      // offline or slow: try the next name
    }
  }
  return null
}

/** Search OpenStreetMap, then Wikidata, for a place by name inside its city. Never throws: null when nothing fits. */
export async function geocode(
  { name, altName, hood, slug }: { name: string; altName?: string | null; hood?: string | null; slug: string },
  fetcher: Fetcher = fetch as unknown as Fetcher,
): Promise<LatLng | null> {
  const c = CITY_COORDS[slug]
  if (!c || !name.trim()) return null
  const d = cityRadiusKm(slug) / 111
  const viewbox = `${c[1] - d * 1.25},${c[0] + d},${c[1] + d * 1.25},${c[0] - d}`
  const queries = [...new Set([[name, hood].filter(Boolean).join('، '), name, altName ?? ''].filter((q) => q.trim().length > 2))]
  for (const q of queries) {
    try {
      const params = new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'sy', limit: '5', viewbox, bounded: '1' })
      const res = await fetcher(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'ar,en' }, signal: AbortSignal.timeout(6000) })
      if (!res.ok) continue
      const p = pickHit(await res.json(), name, altName, slug)
      if (p) return p
    } catch {
      // offline or slow: the place keeps its search link
    }
  }
  return wikidataPoint(name, altName, slug, fetcher)
}

/** Where to pin a place: what the editor gave, then our reviewed list, then OpenStreetMap. */
export async function resolvePoint(
  { lat, lng, mapLink, name, altName, hood, slug }: { lat?: number | null; lng?: number | null; mapLink?: string | null; name: string; altName?: string | null; hood?: string | null; slug: string },
  fetcher?: Fetcher,
): Promise<LatLng | null> {
  if (lat != null && lng != null && inSyria([lat, lng])) return [lat, lng]
  const fromLink = parsePoint(mapLink)
  if (fromLink) return fromLink
  return placePoint(slug, name) ?? (altName ? placePoint(slug, altName) : null) ?? (await geocode({ name, altName, hood, slug }, fetcher))
}

/** A record's own point when it has one, else our reviewed list by its Arabic name. */
export function pointOf(rec: { lat?: number | null; lng?: number | null } | null | undefined, slug: string, arName: string | null | undefined): LatLng | null {
  if (rec?.lat != null && rec?.lng != null && inSyria([rec.lat, rec.lng])) return [rec.lat, rec.lng]
  return placePoint(slug, arName)
}
