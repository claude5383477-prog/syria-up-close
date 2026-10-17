import { describe, expect, it } from 'vitest'
import { isTranslated, pick } from '@/lib/localized'

describe('pick (values fetched with locale: "all")', () => {
  it('returns the requested language when present', () => {
    expect(pick({ ar: 'دمشق', en: 'Damascus' }, 'en')).toEqual({ value: 'Damascus', lang: 'en' })
    expect(pick({ ar: 'دمشق', en: 'Damascus' }, 'ar')).toEqual({ value: 'دمشق', lang: 'ar' })
  })

  it('falls back to Arabic and says so, when English is missing or blank', () => {
    expect(pick({ ar: 'دمشق', en: null }, 'en')).toEqual({ value: 'دمشق', lang: 'ar' })
    expect(pick({ ar: 'دمشق', en: '  ' }, 'en')).toEqual({ value: 'دمشق', lang: 'ar' })
    expect(pick({ ar: 'دمشق' }, 'en')).toEqual({ value: 'دمشق', lang: 'ar' })
  })

  it('returns null when nothing is there', () => {
    expect(pick({ ar: null, en: null }, 'en')).toBeNull()
    expect(pick(null, 'ar')).toBeNull()
    expect(pick(undefined, 'en')).toBeNull()
    expect(pick('', 'ar')).toBeNull()
  })

  it('treats non-localized values as already in the requested language', () => {
    expect(pick('معلولا', 'ar')).toEqual({ value: 'معلولا', lang: 'ar' })
    expect(pick(5, 'en')).toEqual({ value: 5, lang: 'en' })
  })

  it('handles localized rich text (objects) without mistaking them for locale maps', () => {
    const ar = { root: { children: [{ type: 'paragraph', children: [{ text: 'نص' }] }] } }
    const empty = { root: { children: [] } }
    expect(pick({ ar, en: null }, 'en')).toEqual({ value: ar, lang: 'ar' })
    expect(pick(ar, 'ar')).toEqual({ value: ar, lang: 'ar' })
    expect(pick({ ar, en: empty }, 'en')).toEqual({ value: ar, lang: 'ar' })
  })
})

describe('isTranslated', () => {
  it('is true for Arabic always, and for English only when every main field has English', () => {
    const doc = [{ ar: 'أ', en: 'A' }, { ar: 'ب', en: null }]
    expect(isTranslated(doc, 'ar')).toBe(true)
    expect(isTranslated(doc, 'en')).toBe(false)
    expect(isTranslated([{ ar: 'أ', en: 'A' }, 'plain'], 'en')).toBe(true)
    expect(isTranslated([null, { ar: 'أ', en: 'A' }], 'en')).toBe(true)
  })
})
