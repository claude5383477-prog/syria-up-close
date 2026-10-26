import { describe, expect, it } from 'vitest'
import { CITIES } from '@/seed/data'
import { archClip, cityTheme, THEMED_CITIES } from '@/lib/cityTheme'
import { CITY_COORDS, cityPoint, mapPoint, SYRIA_OUTLINE } from '@/lib/geo'
import { buildDays, clampDays, MAX_DAYS, planTrip } from '@/lib/tripPlan'
import { distanceKm, distanceText, mapLink, placePoint } from '@/lib/maplinks'
import GEO from '@/content/places-geo.json'
import { splitStays } from '@/lib/stays'
import contentCities from '../../seed-content/cities.json'
import { existsSync } from 'node:fs'
import { GUIDE, STORIES, type CityGuide } from '@/content/guide'
import { staticPhoto } from '@/content/photos'

const seedSlugs = [...new Set([...CITIES.map((c) => c.slug), ...contentCities.cities.map((c) => c.slug)])]

describe('geo', () => {
  it('places every seeded city inside the frame', () => {
    for (const slug of seedSlugs) {
      const p = cityPoint(slug)
      expect(p, slug).not.toBeNull()
      expect(p!.x).toBeGreaterThan(0)
      expect(p!.x).toBeLessThan(100)
      expect(p!.y).toBeGreaterThan(0)
      expect(p!.y).toBeLessThan(100)
    }
  })

  it('keeps geography: Aleppo north of Damascus, Deir ez-Zor east of Homs', () => {
    expect(cityPoint('aleppo')!.y).toBeLessThan(cityPoint('damascus')!.y)
    expect(cityPoint('deir-ez-zor')!.x).toBeGreaterThan(cityPoint('homs')!.x)
  })

  it('returns null for an unknown city and rounds to one decimal', () => {
    expect(cityPoint('atlantis')).toBeNull()
    expect(mapPoint(35.6, 36.2)).toEqual({ x: 12, y: 35.8 })
  })

  it('has coordinates in the outline’s frame and a closed outline path', () => {
    expect(Object.keys(CITY_COORDS)).toHaveLength(20)
    expect(SYRIA_OUTLINE.startsWith('M')).toBe(true)
    expect(SYRIA_OUTLINE.endsWith('Z')).toBe(true)
    const nums = SYRIA_OUTLINE.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...nums)).toBeLessThanOrEqual(100)
  })
})

describe('cityTheme', () => {
  it('gives every seeded city its own architecture theme, in both languages', () => {
    for (const slug of seedSlugs) {
      expect(THEMED_CITIES, slug).toContain(slug)
      const t = cityTheme(slug)
      expect(t.style.ar.length).toBeGreaterThan(2)
      expect(t.style.en.length).toBeGreaterThan(2)
      expect(t.note.en.length).toBeGreaterThan(20)
    }
  })

  it('matches the architecture: ablaq for Damascus, norias for Hama, Abbasid brick for Raqqa', () => {
    expect(cityTheme('damascus').pattern).toBe('ablaq')
    expect(cityTheme('hama').pattern).toBe('noria')
    expect(cityTheme('raqqa')).toMatchObject({
      pattern: 'brick',
      arch: 'pointed',
    })
    expect(cityTheme('mashquita').pattern).toBe('waves')
  })

  it('falls back to the mountain-village theme', () => {
    expect(cityTheme('new-town').pattern).toBe('roofs')
  })

  it('turns an arch into a clip-path', () => {
    expect(archClip('pointed')).toMatch(/^polygon\(/)
    expect(archClip('round')).toMatch(/round 50%/)
    expect(archClip('square')).toBe('inset(0 round 18px)')
  })
})

describe('planTrip', () => {
  it('gives every day to a stop, one stop per two days, interests in turn, along the road', () => {
    expect(planTrip(5, ['history', 'nature'])).toEqual([
      { slug: 'damascus', days: 3 },
      { slug: 'bloudan', days: 2 },
    ])
    expect(planTrip(7, ['history', 'sea'])).toEqual([
      { slug: 'damascus', days: 3 },
      { slug: 'latakia', days: 2 },
      { slug: 'aleppo', days: 2 },
    ])
  })

  it('never repeats a city and adds up to the days chosen', () => {
    const plan = planTrip(10, ['food', 'history', 'sea'])
    expect(new Set(plan.map((s) => s.slug)).size).toBe(plan.length)
    expect(plan.reduce((n, s) => n + s.days, 0)).toBe(10)
  })

  it('uses the cities the reader picked, in road order, at most one per day', () => {
    expect(planTrip(7, ['history'], ['aleppo', 'damascus', 'latakia'])).toEqual([
      { slug: 'damascus', days: 3 },
      { slug: 'latakia', days: 2 },
      { slug: 'aleppo', days: 2 },
    ])
    expect(planTrip(2, [], ['aleppo', 'damascus', 'latakia', 'aleppo'])).toEqual([
      { slug: 'damascus', days: 1 },
      { slug: 'latakia', days: 1 },
    ])
  })

  it('falls back to Damascus and keeps the days in range', () => {
    expect(planTrip(3, [])).toEqual([{ slug: 'damascus', days: 3 }])
    expect(planTrip(4, ['history'], [], ['damascus', 'hama'])).toEqual([
      { slug: 'damascus', days: 2 },
      { slug: 'hama', days: 2 },
    ])
    expect(planTrip(4, [], ['nowhere'], ['damascus'])).toEqual([{ slug: 'damascus', days: 4 }])
    expect(planTrip(1, ['family'])).toEqual([{ slug: 'damascus', days: 1 }])
    expect(clampDays(100)).toBe(MAX_DAYS)
    expect(clampDays(0)).toBe(1)
    expect(clampDays(Number.NaN)).toBe(1)
  })
})

describe('buildDays', () => {
  const packs = {
    damascus: {
      sights: [
        { name: 'A', href: 'a' },
        { name: 'B', note: 'b', href: 'b' },
        { name: 'C', href: 'c' },
      ],
      eats: [
        { name: 'R1', hood: 'h', href: 'r1' },
        { name: 'R2', href: 'r2' },
      ],
      dish: 'kibbeh',
    },
    hama: { sights: [], eats: [], dish: 'halawet el-jibn' },
  }

  it('arrives, moves between stops, fills sights then free time, and dines at real places', () => {
    const days = buildDays(
      [
        { slug: 'damascus', days: 3 },
        { slug: 'hama', days: 1 },
        { slug: 'nowhere', days: 1 },
      ],
      packs,
    )
    expect(days.map((d) => d.n)).toEqual([1, 2, 3, 4, 5])
    expect(days[0]!.items).toEqual([
      { slot: 0, kind: 'arrive' },
      { slot: 1, kind: 'sight', name: 'A', note: undefined, href: 'a' },
      {
        slot: 2,
        kind: 'dine',
        name: 'R1',
        hood: 'h',
        dish: 'kibbeh',
        href: 'r1',
      },
    ])
    expect(days[1]!.items.map((i) => i.kind)).toEqual(['sight', 'sight', 'dine'])
    expect(days[1]!.items[2]).toMatchObject({ name: 'R2', dish: undefined })
    expect(days[2]!.items.map((i) => i.kind)).toEqual(['free', 'free', 'dine'])
    expect(days[3]!.items).toEqual([
      { slot: 0, kind: 'move', from: 'damascus' },
      { slot: 1, kind: 'free' },
      { slot: 2, kind: 'taste', dish: 'halawet el-jibn' },
    ])
    expect(days[4]!.items.map((i) => i.kind)).toEqual(['move', 'free', 'free'])
  })
})

describe('map links', () => {
  it('finds a geocoded place by its Arabic name and links directions to it', () => {
    const p = placePoint('damascus', ' الجامع الأموي ')
    expect(p).not.toBeNull()
    expect(mapLink(p, 'x', 'y')).toBe(`https://www.google.com/maps/dir/?api=1&destination=${p![0]},${p![1]}`)
    expect(placePoint('damascus', null)).toBeNull()
    expect(placePoint('nowhere', 'x')).toBeNull()
  })

  it('falls back to a name search in the city', () => {
    expect(mapLink(null, 'بيت جبري', 'دمشق')).toBe('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('بيت جبري دمشق'))
  })

  it('every geocoded point sits in Syria', () => {
    for (const [slug, places] of Object.entries(GEO)) {
      expect(cityPoint(slug), slug).not.toBeNull()
      for (const [name, [lat = 0, lng = 0]] of Object.entries(places)) {
        expect(lat > 32 && lat < 37.5 && lng > 35.5 && lng < 42.5, `${slug} ${name}`).toBe(true)
      }
    }
  })

  it('measures and words distances', () => {
    expect(distanceKm([33.5, 36.3], [33.5, 36.3])).toBe(0)
    expect(Math.round(distanceKm([33.5115, 36.3065], [36.2021, 37.1343]))).toBeGreaterThan(300)
    expect(distanceText(0.01, 'ar')).toBe('50 م')
    expect(distanceText(0.64, 'en')).toBe('650 m')
    expect(distanceText(3.26, 'ar')).toBe('3.3 كم')
    expect(distanceText(42.4, 'en')).toBe('42 km')
  })
})

describe('splitStays', () => {
  it('separates hotels from the city’s Ahleen page', () => {
    const stays = [
      { id: 1, ahleenUrl: 'https://www.ahleenbooking.com/hotels/aram-hotel' },
      { id: 2, ahleenUrl: null },
      { id: 3, ahleenUrl: 'https://www.ahleenbooking.com/cities/damascus' },
      { id: 4, ahleenUrl: 'https://www.ahleenbooking.com/cities/other' },
    ]
    expect(splitStays(stays)).toEqual({
      hotels: [stays[0], stays[1]],
      cityPage: 'https://www.ahleenbooking.com/cities/damascus',
    })
  })

  it('treats a malformed URL as a hotel link, never as the city page', () => {
    expect(splitStays([{ ahleenUrl: 'not a url' }])).toEqual({
      hotels: [{ ahleenUrl: 'not a url' }],
      cityPage: null,
    })
  })
})

describe('starter guide content', () => {
  const keys = (g: CityGuide) => [...g.gallery, ...g.venues.map((x) => x.photo), ...g.parks.map((x) => x.photo)].filter(Boolean) as string[]

  it('covers every seeded city with food, parks, lore of all three kinds and a gallery', () => {
    for (const slug of seedSlugs) {
      const g = GUIDE[slug]!
      expect(g, slug).toBeDefined()
      expect(g.venues.length, slug).toBeGreaterThan(0)
      expect(g.parks.length, slug).toBeGreaterThan(0)
      expect(g.gallery.length, slug).toBeGreaterThanOrEqual(1)
      for (const kind of ['secret', 'joke', 'proverb'])
        expect(
          g.lore.some((l) => l.kind === kind),
          `${slug} ${kind}`,
        ).toBe(true)
    }
  })

  it('points only at photos that exist, each with a credit', () => {
    const all = [...Object.values(GUIDE).flatMap(keys), ...STORIES.flatMap((s) => s.photos)]
    for (const key of all) {
      const p = staticPhoto(key)
      expect(p, key).not.toBeNull()
      expect(p!.credit.length, key).toBeGreaterThan(3)
      // The owner's permitted collection (sv-*, docs/photo-permissions.md) may still link to X until
      // npm run photos:localize copies it; anything else remote must be a Commons thumbnail.
      if (key.startsWith('sv-') && p!.src.startsWith('https://')) {
        expect(p!.src, key).toMatch(/^https:\/\/pbs\.twimg\.com\/media\/[\w-]+\?format=jpg&name=large$/)
        expect(p!.credit, key).toBe('صورة من مجموعة سوريا عن قرب')
      } else if (p!.src.startsWith('https://')) expect(p!.src, key).toMatch(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/960px-/)
      else expect(existsSync(new URL(`../../public${p!.src}`, import.meta.url)), key).toBe(true)
    }
    expect(staticPhoto(undefined)).toBeNull()
    expect(staticPhoto('no-such-photo')).toBeNull()
  })

  it('has unique story slugs and no prices', () => {
    expect(new Set(STORIES.map((s) => s.slug)).size).toBe(STORIES.length)
    expect(JSON.stringify(GUIDE) + JSON.stringify(STORIES)).not.toMatch(/ل\.س|\$|USD|SYP|ليرة/)
  })
})
