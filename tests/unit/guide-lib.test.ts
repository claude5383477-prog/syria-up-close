import { describe, expect, it } from 'vitest'
import { CITIES } from '@/seed/data'
import { archClip, cityTheme, THEMED_CITIES } from '@/lib/cityTheme'
import { CITY_COORDS, cityPoint, mapPoint, SYRIA_OUTLINE } from '@/lib/geo'
import { planTrip } from '@/lib/tripPlan'
import { splitStays } from '@/lib/stays'
import contentCities from '../../seed-content/cities.json'

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
    expect(cityTheme('raqqa')).toMatchObject({ pattern: 'brick', arch: 'pointed' })
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
  it('spreads the nights over one stop per two nights, in interest order', () => {
    expect(planTrip(5, ['history', 'nature'])).toEqual([
      { slug: 'damascus', nights: 2 },
      { slug: 'aleppo', nights: 2 },
    ])
  })

  it('never repeats a city and gives every night to a stop', () => {
    const plan = planTrip(10, ['food', 'history', 'sea'])
    expect(new Set(plan.map((s) => s.slug)).size).toBe(plan.length)
    expect(plan.reduce((n, s) => n + s.nights, 0)).toBe(9)
    expect(plan[0]!.slug).toBe('damascus')
  })

  it('uses few stops for a short trip and Damascus when nothing is chosen', () => {
    expect(planTrip(10, ['sea'])).toEqual([
      { slug: 'latakia', nights: 5 },
      { slug: 'tartous', nights: 4 },
    ])
    expect(planTrip(3, [])).toEqual([{ slug: 'damascus', nights: 2 }])
    expect(planTrip(1, ['family'])).toEqual([{ slug: 'damascus', nights: 1 }])
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
    expect(splitStays(stays)).toEqual({ hotels: [stays[0], stays[1]], cityPage: 'https://www.ahleenbooking.com/cities/damascus' })
  })

  it('treats a malformed URL as a hotel link, never as the city page', () => {
    expect(splitStays([{ ahleenUrl: 'not a url' }])).toEqual({ hotels: [{ ahleenUrl: 'not a url' }], cityPage: null })
  })
})
