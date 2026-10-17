import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, dir, isLocale } from '@/lib/i18n'

describe('i18n helpers', () => {
  it('accepts only ar and en', () => {
    expect(isLocale('ar')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale('')).toBe(false)
  })

  it('defaults to Arabic, right-to-left', () => {
    expect(DEFAULT_LOCALE).toBe('ar')
    expect(dir('ar')).toBe('rtl')
    expect(dir('en')).toBe('ltr')
  })
})
