import { describe, expect, it } from 'vitest'
import research from '../../seed-content/research-2026-10.json'
import contentCities from '../../seed-content/cities.json'
import { checkSubcategory } from '@/lib/venueClass'
import { VENUE_KINDS } from '@/collections/Venues'

const slugs = new Set(contentCities.cities.map((c) => c.slug))

// Researched starter content: every line real (a source), in a known city, and valid for its collection.
describe('research seed content', () => {
  it('gives every venue a known city, kind, valid class and https source', () => {
    for (const v of research.venues) {
      expect(slugs.has(v.city), v.name.ar).toBe(true)
      expect(VENUE_KINDS as readonly string[]).toContain(v.kind)
      expect(checkSubcategory(v.category, v.subcategory), v.name.ar).toBe(true)
      expect(v.sourceUrl).toMatch(/^https:\/\//)
      expect(v.name.ar && v.name.en && v.note.ar && v.note.en).toBeTruthy()
    }
  })

  it('gives every lore item a known city, kind and https source, with no duplicates', () => {
    const seen = new Set<string>()
    for (const l of research.lore) {
      expect(slugs.has(l.city), l.text).toBe(true)
      expect(['secret', 'joke', 'proverb']).toContain(l.kind)
      expect(l.sourceUrl).toMatch(/^https:\/\//)
      if (l.kind === 'proverb') expect(l.meaning, l.text).toBeTruthy()
      expect(seen.has(l.text), l.text).toBe(false)
      seen.add(l.text)
    }
  })

  it('carries no price or safety wording', () => {
    expect(JSON.stringify(research.venues)).not.toMatch(/"(price|cost|fee|safe|safety|secure)"/i)
  })
})

describe('research city food updates', () => {
  it('only replaces the exact starter "what to eat" text of a known city', () => {
    for (const e of research.cityEat) {
      const city = contentCities.cities.find((c) => c.slug === e.city)
      expect(city?.food.ar, e.city).toBe(e.replaces.ar)
      expect(e.ar && e.en).toBeTruthy()
    }
  })
})
