import { describe, expect, it } from 'vitest'
import { allSubcategoryOptions, mergeByName, checkSubcategory, countIn, defaultCategory, emptySubcategories, isCategory, subcategoriesOf, subcategoryLabel } from '@/lib/venueClass'
import { GUIDE } from '@/content/guide'

describe('restaurant classes', () => {
  it('has the two classes and their sections from the owner brief', () => {
    expect(subcategoriesOf('tourist').map((s) => subcategoryLabel(s).ar)).toEqual(['بيوت عربية', 'مطبخ شامي', 'سطوح وإطلالات', 'كافيهات'])
    expect(subcategoriesOf('popular').map((s) => subcategoryLabel(s).ar)).toEqual(['شاورما', 'مشاوي', 'طبخ عربي', 'فطور', 'فلافل وسندويش', 'مناقيش وفطائر'])
    expect(allSubcategoryOptions()).toHaveLength(10)
    expect(isCategory('tourist')).toBe(true)
    expect(isCategory('sweets')).toBe(false)
  })

  it('accepts a section of the chosen class, or none, and refuses the rest', () => {
    expect(checkSubcategory('tourist', 'arab-house')).toBe(true)
    expect(checkSubcategory('popular', null)).toBe(true)
    expect(checkSubcategory(undefined, '')).toBe(true)
    expect(checkSubcategory('tourist', 'shawarma')).toMatch(/لا يتبع/)
    expect(checkSubcategory(null, 'shawarma')).toMatch(/اختر صنف/)
  })

  it('counts places and finds the empty sections', () => {
    const items = [
      { category: 'tourist', subcategory: 'cafe' },
      { category: 'tourist', subcategory: null },
      { category: 'popular', subcategory: 'shawarma' },
    ] as const
    expect(countIn(items, 'tourist')).toBe(2)
    expect(countIn(items, 'tourist', 'cafe')).toBe(1)
    expect(emptySubcategories(items, 'popular')).toEqual(['grills', 'home-cooking', 'breakfast', 'falafel', 'manakish'])
    expect(defaultCategory(items)).toBe('tourist')
    expect(defaultCategory([{ category: 'popular' }])).toBe('popular')
  })

  it('classifies every starter restaurant and cafe, with sections only where a source says so', () => {
    for (const [slug, g] of Object.entries(GUIDE)) {
      for (const v of g.venues) {
        if (v.kind !== 'restaurant' && v.kind !== 'cafe') {
          expect(v.category, `${slug}: ${v.name.ar}`).toBeUndefined()
          continue
        }
        expect(isCategory(v.category), `${slug}: ${v.name.ar}`).toBe(true)
        expect(checkSubcategory(v.category, v.subcategory), `${slug}: ${v.name.ar}`).toBe(true)
        if (v.kind === 'cafe') expect(v.subcategory).toBe('cafe')
      }
    }
    const naranj = GUIDE.damascus!.venues.find((v) => v.name.ar === 'النارنج')
    expect([naranj?.category, naranj?.subcategory]).toEqual(['tourist', 'arab-house'])
  })
})

describe('mergeByName', () => {
  it('keeps every record and adds the starter entries whose name no record uses', () => {
    const name = (v: { n: string }) => v.n
    expect(mergeByName([{ n: 'بكداش' }], [{ n: 'نارنج' }, { n: ' بكداش ' }, { n: 'بيت جبري' }], name).map(name)).toEqual(['بكداش', 'نارنج', 'بيت جبري'])
    expect(mergeByName([], [{ n: 'أ' }], name).map(name)).toEqual(['أ'])
  })
})
