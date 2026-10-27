import { describe, expect, it, vi } from 'vitest'
import { cityRadiusKm, geocode, inSyria, nearCity, normName, parsePoint, pickHit, pointOf, resolvePoint, sameName, type Fetcher } from '@/lib/geocode'
import { coordinateFields, fillCoordinates } from '@/hooks/fillCoordinates'

const ok = (body: unknown): Fetcher => vi.fn(async () => ({ ok: true, json: async () => body }))
const hit = (name: string, lat: number, lon: number) => ({ name, lat: String(lat), lon: String(lon) })

describe('lib/geocode: names and points', () => {
  it('normalises Arabic names: diacritics, alef forms, ta marbuta, the article and a kind prefix', () => {
    expect(normName('مطعم النَّوفرة')).toBe('نوفره')
    expect(normName('حلويات أبو طلال')).toBe('ابو طلال')
    expect(normName('Restaurant Naranj (Old City)')).toBe('naranj')
    expect(normName(null)).toBe('')
  })

  it('compares names loosely but never on two letters', () => {
    expect(sameName('النوفرة', 'مقهى النوفرة')).toBe(true)
    expect(sameName('بيت جبري', 'مطعم بيت جبري الدمشقي')).toBe(true)
    expect(sameName('أب', 'أب')).toBe(false)
    expect(sameName('النوفرة', 'الحميدية')).toBe(false)
  })

  it('reads a point from a typed pair or a Google / OpenStreetMap link, inside Syria only', () => {
    expect(parsePoint('33.5117, 36.3067')).toEqual([33.5117, 36.3067])
    expect(parsePoint('33.5117، 36.3067')).toEqual([33.5117, 36.3067])
    expect(parsePoint('https://www.google.com/maps/place/X/@33.5117,36.3067,17z')).toEqual([33.5117, 36.3067])
    expect(parsePoint('https://www.google.com/maps/place/X/data=!3d33.51!4d36.30')).toEqual([33.51, 36.3])
    expect(parsePoint('https://maps.google.com/?q=35.13,36.75')).toEqual([35.13, 36.75])
    expect(parsePoint('https://www.openstreetmap.org/#map=17/34.73/36.71')).toEqual([34.73, 36.71])
    expect(parsePoint('https://www.openstreetmap.org/?mlat=34.73&mlon=36.71')).toEqual([34.73, 36.71])
    expect(parsePoint('48.85, 2.35')).toBeNull()
    expect(parsePoint('https://maps.app.goo.gl/abc')).toBeNull()
    expect(parsePoint('')).toBeNull()
    expect(parsePoint(undefined)).toBeNull()
  })

  it('keeps pins inside the city: 25 km for a main city, 12 km for a resort', () => {
    expect(cityRadiusKm('damascus')).toBe(25)
    expect(cityRadiusKm('bloudan')).toBe(12)
    expect(inSyria([33.5, 36.3])).toBe(true)
    expect(nearCity([33.51, 36.3], 'damascus')).toBe(true)
    expect(nearCity([36.2, 37.13], 'damascus')).toBe(false)
    expect(nearCity([33.0, 36.0], 'no-such-city')).toBe(true)
    expect(nearCity([48.8, 2.3], 'no-such-city')).toBe(false)
  })

  it('prefers a record’s own point, else the reviewed list by Arabic name', () => {
    expect(pointOf({ lat: 33.5, lng: 36.3 }, 'damascus', 'x')).toEqual([33.5, 36.3])
    expect(pointOf({ lat: 1, lng: 1 }, 'damascus', 'الجامع الأموي')).toEqual([33.51171, 36.30666])
    expect(pointOf(null, 'damascus', 'لا يوجد')).toBeNull()
  })
})

describe('lib/geocode: OpenStreetMap search', () => {
  it('takes the first result named like the place inside the city', () => {
    const hits = [hit('Somewhere else', 33.51, 36.3), hit('النوفرة', 36.2, 37.1), hit('مقهى النوفرة', 33.511, 36.307)]
    expect(pickHit(hits, 'النوفرة', null, 'damascus')).toEqual([33.511, 36.307])
    expect(pickHit([{ display_name: 'Naranj, Damascus', lat: '33.509', lon: '36.311' }], 'نارنج', 'Naranj', 'damascus')).toEqual([33.509, 36.311])
    expect(pickHit([{ name: 'x', lat: 'n', lon: '1' }], 'x', null, 'damascus')).toBeNull()
    expect(pickHit({ error: 1 }, 'x', null, 'damascus')).toBeNull()
  })

  it('searches by name with the neighbourhood first, inside the city box', async () => {
    const f = ok([hit('بيت جبري', 33.5105, 36.3085)])
    expect(await geocode({ name: 'بيت جبري', hood: 'دمشق القديمة', slug: 'damascus' }, f)).toEqual([33.5105, 36.3085])
    const url = String(vi.mocked(f).mock.calls[0]![0])
    expect(url).toContain('countrycodes=sy')
    expect(url).toContain('bounded=1')
    expect(decodeURIComponent(url.replace(/\+/g, ' '))).toContain('بيت جبري، دمشق القديمة')
  })

  it('tries the other names when the first finds nothing, and gives up quietly', async () => {
    const calls: string[] = []
    const f: Fetcher = async (url) => {
      calls.push(url)
      return calls.length === 1 ? { ok: false, json: async () => [] } : calls.length === 2 ? Promise.reject(new Error('offline')) : { ok: true, json: async () => [hit('Naranj', 33.509, 36.311)] }
    }
    expect(await geocode({ name: 'نارنج', altName: 'Naranj', hood: 'باب شرقي', slug: 'damascus' }, f)).toEqual([33.509, 36.311])
    expect(calls).toHaveLength(3)
    expect(await geocode({ name: 'نارنج', slug: 'no-such-city' }, ok([]))).toBeNull()
    expect(await geocode({ name: '  ', slug: 'damascus' }, ok([]))).toBeNull()
    expect(await geocode({ name: 'لا شيء', slug: 'damascus' }, ok([]))).toBeNull()
  })

  it('resolves in order: typed point, pasted link, reviewed list, then the search', async () => {
    const f = ok([hit('مكان جديد', 33.52, 36.29)])
    expect(await resolvePoint({ lat: 33.4, lng: 36.2, name: 'x', slug: 'damascus' }, f)).toEqual([33.4, 36.2])
    expect(await resolvePoint({ mapLink: 'https://maps.google.com/?q=33.41,36.21', name: 'x', slug: 'damascus' }, f)).toEqual([33.41, 36.21])
    expect(await resolvePoint({ name: 'الجامع الأموي', slug: 'damascus' }, f)).toEqual([33.51171, 36.30666])
    expect(await resolvePoint({ name: 'غير موجود', altName: 'الجامع الأموي', slug: 'damascus' }, f)).toEqual([33.51171, 36.30666])
    expect(await resolvePoint({ name: 'مكان جديد', slug: 'damascus' }, f)).toEqual([33.52, 36.29])
  })
})

describe('hooks/fillCoordinates', () => {
  const req = (slug: string | null = 'damascus', fail = false) => ({
    payload: { findByID: vi.fn(async () => (fail ? Promise.reject(new Error('db')) : slug ? { slug } : null)), logger: { warn: vi.fn() } },
  })
  const run = (data: object, originalDoc?: object, r = req(), fetcher: Fetcher = ok([hit('مكان جديد', 33.52, 36.29)])) =>
    fillCoordinates({ nameField: 'name', hoodField: 'neighbourhood', fetcher })({ data, originalDoc, req: r } as never) as Promise<Record<string, unknown>>

  it('adds three sidebar fields: a map link and the point', () => {
    expect(coordinateFields.map((f) => ('name' in f ? f.name : ''))).toEqual(['mapLink', 'lat', 'lng'])
  })

  it('looks a new place up by name on save', async () => {
    expect(await run({ name: 'مكان جديد', city: 3 })).toMatchObject({ lat: 33.52, lng: 36.29 })
    expect(await run({ name: 'الجامع الأموي', city: { id: 3 } })).toMatchObject({ lat: 33.51171, lng: 36.30666 })
  })

  it('a pasted link sets the point', async () => {
    expect(await run({ name: 'x', city: 3, mapLink: 'https://www.google.com/maps/place/X/@33.41,36.21,17z' })).toMatchObject({ lat: 33.41, lng: 36.21 })
    // An unreadable link falls through to the name search.
    expect(await run({ name: 'مكان جديد', city: 3, mapLink: 'https://maps.app.goo.gl/x' })).toMatchObject({ lat: 33.52, lng: 36.29 })
  })

  it('keeps a point the editor typed, and an existing point when nothing moved', async () => {
    expect(await run({ name: 'x', city: 3, lat: 33.3, lng: 36.1 }, { name: 'x', city: 3, lat: 33.5, lng: 36.3 })).toMatchObject({ lat: 33.3, lng: 36.1 })
    const f = ok([])
    expect(await run({ name: 'x', city: 3, lat: 33.5, lng: 36.3 }, { name: 'x', city: 3, lat: 33.5, lng: 36.3 }, req(), f)).toMatchObject({ lat: 33.5, lng: 36.3 })
    expect(f).not.toHaveBeenCalled()
  })

  it('looks again when the place is renamed or moves city, and clears a pin it cannot place', async () => {
    expect(await run({ name: 'مكان جديد', city: 3, lat: 33.5, lng: 36.3 }, { name: 'قديم', city: 3, lat: 33.5, lng: 36.3 })).toMatchObject({ lat: 33.52, lng: 36.29 })
    expect(await run({ name: 'لا شيء', city: 4, lat: 33.5, lng: 36.3 }, { name: 'لا شيء', city: 3, lat: 33.5, lng: 36.3 }, req(), ok([]))).toMatchObject({ lat: null, lng: null })
  })

  it('never fails a save: no name, no city, unknown city or a database error leave the data as is', async () => {
    expect(await run({ city: 3 })).toEqual({ city: 3 })
    expect(await run({ name: 'x' })).toEqual({ name: 'x' })
    expect(await run({ name: 'x', city: 3 }, undefined, req(null))).toEqual({ name: 'x', city: 3 })
    const r = req('damascus', true)
    expect(await run({ name: 'x', city: 3 }, undefined, r)).toEqual({ name: 'x', city: 3 })
    expect(r.payload.logger.warn).toHaveBeenCalled()
  })
})
