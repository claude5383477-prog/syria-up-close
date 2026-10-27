import type { CollectionBeforeChangeHook, Field } from 'payload'
import { parsePoint, resolvePoint, type Fetcher } from '@/lib/geocode'

/**
 * The map pin of a place, restaurant, park or hotel fills itself on save (owner request 2026-10-27),
 * so the city map updates with every addition. An editor can type the point or paste a Google Maps /
 * OpenStreetMap link; otherwise it is looked up (lib/geocode). Saving never fails over it: with no
 * point found the place shows on the map's list with a search link, as before.
 */
export const coordinateFields: Field[] = [
  {
    name: 'mapLink',
    type: 'text',
    label: { ar: 'رابط الموقع على الخريطة (اختياري)', en: 'Map link (optional)' },
    admin: {
      position: 'sidebar',
      description: {
        ar: 'الصق رابط المكان من خرائط Google أو OpenStreetMap، أو اكتب "خط العرض، خط الطول". إن تركته فارغاً نبحث عن المكان بالاسم عند الحفظ.',
        en: 'Paste the place’s Google Maps or OpenStreetMap link, or type "lat, lng". Left empty, we look the place up by name on save.',
      },
    },
  },
  { name: 'lat', type: 'number', label: { ar: 'خط العرض', en: 'Latitude' }, admin: { position: 'sidebar', step: 0.00001 } },
  { name: 'lng', type: 'number', label: { ar: 'خط الطول', en: 'Longitude' }, admin: { position: 'sidebar', step: 0.00001 } },
]

type Rec = Record<string, unknown>
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const idOf = (v: unknown): number | string | null => (typeof v === 'number' || typeof v === 'string' ? v : v && typeof v === 'object' && 'id' in v ? ((v as { id: number | string }).id ?? null) : null)

export function fillCoordinates({ nameField, hoodField, fetcher }: { nameField: string; hoodField?: string; fetcher?: Fetcher }): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, req }) => {
    const d = data as Rec
    const o = (originalDoc ?? {}) as Rec
    try {
      // 1. A pasted link wins when it changed.
      const link = str(d.mapLink)
      if (link && link !== str(o.mapLink)) {
        const p = parsePoint(link)
        if (p) {
          d.lat = p[0]
          d.lng = p[1]
          return d
        }
      }
      const typed = num(d.lat) !== null && num(d.lng) !== null
      const typedNew = typed && (num(d.lat) !== num(o.lat) || num(d.lng) !== num(o.lng))
      if (typedNew) return d
      const name = str(d[nameField]) ?? str(o[nameField])
      const cityId = idOf(d.city) ?? idOf(o.city)
      const renamed = str(d[nameField]) !== null && str(d[nameField]) !== str(o[nameField])
      const moved = idOf(d.city) !== null && o.city != null && idOf(d.city) !== idOf(o.city)
      if (typed && !renamed && !moved) return d
      if (!name || cityId === null) return d
      const city = await req.payload.findByID({ collection: 'cities', id: cityId, depth: 0, req })
      const slug = str(city?.slug)
      if (!slug) return d
      const p = await resolvePoint({ name, hood: hoodField ? str(d[hoodField]) ?? str(o[hoodField]) : null, slug }, fetcher)
      d.lat = p ? p[0] : null
      d.lng = p ? p[1] : null
    } catch (err) {
      req.payload.logger.warn({ msg: 'fillCoordinates: no point', err })
    }
    return d
  }
}
