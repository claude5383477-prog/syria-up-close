import { describe, expect, it } from 'vitest'
import { isArabicOnly, localePath, resolveRoute, switchLocalePath } from '@/lib/routing'

describe('resolveRoute (proxy decision)', () => {
  it('serves unprefixed paths as Arabic via an internal rewrite', () => {
    expect(resolveRoute('/')).toEqual({ type: 'rewrite', to: '/ar' })
    expect(resolveRoute('/cities/damascus')).toEqual({ type: 'rewrite', to: '/ar/cities/damascus' })
  })

  it('passes English through untouched', () => {
    expect(resolveRoute('/en')).toEqual({ type: 'next' })
    expect(resolveRoute('/en/cities/aleppo')).toEqual({ type: 'next' })
  })

  it('permanently redirects explicit /ar URLs to their unprefixed form', () => {
    expect(resolveRoute('/ar')).toEqual({ type: 'redirect', to: '/' })
    expect(resolveRoute('/ar/about')).toEqual({ type: 'redirect', to: '/about' })
  })

  it('does not treat look-alike segments as locales', () => {
    expect(resolveRoute('/english')).toEqual({ type: 'rewrite', to: '/ar/english' })
    expect(resolveRoute('/arabic')).toEqual({ type: 'rewrite', to: '/ar/arabic' })
  })

  it('leaves the CMS, API, correspondent app and Next internals alone', () => {
    for (const p of ['/admin', '/admin/collections/cities', '/api/users', '/correspondent', '/correspondent/login', '/_next/static/x.js']) {
      expect(resolveRoute(p)).toEqual({ type: 'next' })
    }
  })
})

describe('localePath', () => {
  it('keeps Arabic unprefixed and prefixes English', () => {
    expect(localePath('ar', '/')).toBe('/')
    expect(localePath('ar', '/cities')).toBe('/cities')
    expect(localePath('en', '/')).toBe('/en')
    expect(localePath('en', '/cities')).toBe('/en/cities')
  })
})

describe('switchLocalePath', () => {
  it('maps the same page to the other language', () => {
    expect(switchLocalePath('/')).toBe('/en')
    expect(switchLocalePath('/cities/damascus')).toBe('/en/cities/damascus')
    expect(switchLocalePath('/en')).toBe('/')
    expect(switchLocalePath('/en/about')).toBe('/about')
  })
})

describe('isArabicOnly', () => {
  it('flags the inside and seasons sections in either language', () => {
    expect(isArabicOnly('/inside')).toBe(true)
    expect(isArabicOnly('/en/inside')).toBe(true)
    expect(isArabicOnly('/seasons/bloudan-2026-12-01')).toBe(true)
    expect(isArabicOnly('/en/seasons')).toBe(true)
  })

  it('does not flag bilingual pages or look-alikes', () => {
    expect(isArabicOnly('/')).toBe(false)
    expect(isArabicOnly('/en/outside')).toBe(false)
    expect(isArabicOnly('/insider')).toBe(false)
  })
})
