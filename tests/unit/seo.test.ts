import { describe, expect, it } from 'vitest'
import { bodyExcerpt, hasIndexableEnglish, indexablePaths, lexicalText, pageMetadata } from '@/lib/seo'

describe('pageMetadata', () => {
  it('bilingual page: canonical in its own language, hreflang ar/en/x-default', () => {
    expect(pageMetadata({ locale: 'en', path: '/cities/damascus', title: 'Damascus', description: 'd' })).toEqual({
      title: 'Damascus',
      description: 'd',
      alternates: {
        canonical: '/en/cities/damascus',
        languages: { ar: '/cities/damascus', en: '/en/cities/damascus', 'x-default': '/cities/damascus' },
      },
      openGraph: {
        title: 'Damascus',
        description: 'd',
        locale: 'en_US',
        alternateLocale: ['ar_SY'],
        url: '/en/cities/damascus',
        type: 'website',
        siteName: 'Syria Up Close',
        images: [{ url: '/en/og', width: 1200, height: 630, alt: 'Syria Up Close' }],
      },
      twitter: { card: 'summary_large_image' },
    })
    expect(pageMetadata({ locale: 'ar', path: '/', title: 'سوريا عن قرب' }).alternates).toEqual({
      canonical: '/',
      languages: { ar: '/', en: '/en', 'x-default': '/' },
    })
  })

  it('home title is used as is (no "· site" template)', () => {
    const m = pageMetadata({ locale: 'ar', path: '/', title: 'سوريا عن قرب', absoluteTitle: true })
    expect(m.title).toEqual({ absolute: 'سوريا عن قرب' })
    expect(m.openGraph).toMatchObject({ locale: 'ar_SY', alternateLocale: ['en_US'], siteName: 'سوريا عن قرب' })
  })

  it('English page not yet translated: noindex and no English hreflang', () => {
    const m = pageMetadata({ locale: 'en', path: '/outside/first-visit/visa', title: 'Visa', translated: false })
    expect(m.robots).toEqual({ index: false, follow: true })
    expect(m.alternates).toEqual({ canonical: '/en/outside/first-visit/visa', languages: { ar: '/outside/first-visit/visa', 'x-default': '/outside/first-visit/visa' } })
  })

  it('Arabic-only sections: Arabic hreflang only; the /en copy is noindex and points to the Arabic page', () => {
    expect(pageMetadata({ locale: 'ar', path: '/seasons', title: 't', arabicOnly: true }).alternates).toEqual({
      canonical: '/seasons',
      languages: { ar: '/seasons', 'x-default': '/seasons' },
    })
    const en = pageMetadata({ locale: 'en', path: '/inside', title: 't', arabicOnly: true })
    expect(en.robots).toEqual({ index: false, follow: true })
    expect(en.alternates?.canonical).toBe('/inside')
  })

  it('routes with their own social image get no config image (it would override the file)', () => {
    expect(pageMetadata({ locale: 'ar', path: '/cities/aleppo', title: 'حلب', ownImage: true }).openGraph).not.toHaveProperty('images')
  })

  it('pages that must never be indexed', () => {
    expect(pageMetadata({ locale: 'ar', path: '/kit', title: 'Kit', noindex: true }).robots).toEqual({ index: false, follow: false })
  })
})

describe('indexable language versions (one rule for metadata, sitemap and IndexNow)', () => {
  it('bilingual page: Arabic and English', () => {
    expect(hasIndexableEnglish('/cities/aleppo')).toBe(true)
    expect(indexablePaths('/cities/aleppo')).toEqual(['/cities/aleppo', '/en/cities/aleppo'])
    expect(indexablePaths('/')).toEqual(['/', '/en'])
  })
  it('English not translated yet: Arabic only', () => {
    expect(indexablePaths('/outside/first-visit/visa', false)).toEqual(['/outside/first-visit/visa'])
  })
  it('Arabic-only sections never have an English version, whatever the flag says', () => {
    expect(hasIndexableEnglish('/inside/bloudan', true)).toBe(false)
    expect(indexablePaths('/seasons')).toEqual(['/seasons'])
  })
  it('metadata follows the same rule even when a page forgets arabicOnly', () => {
    const m = pageMetadata({ locale: 'en', path: '/inside', title: 't' })
    expect(m.robots).toEqual({ index: false, follow: true })
    expect(m.alternates).toEqual({ canonical: '/inside', languages: { ar: '/inside', 'x-default': '/inside' } })
  })
})

describe('lexicalText / bodyExcerpt', () => {
  const doc = (...paras: string[]) => ({ root: { children: paras.map((p) => ({ type: 'paragraph', children: [{ text: p }] })) } })

  it('flattens paragraphs to plain text', () => {
    expect(lexicalText(doc('أول زهر.', 'الريحة واصلة.'))).toBe('أول زهر. الريحة واصلة.')
    expect(lexicalText(null)).toBe('')
  })

  it('makes a short description cut at a word boundary', () => {
    expect(bodyExcerpt(doc('قصير'))).toBe('قصير')
    expect(bodyExcerpt(null)).toBeUndefined()
    const long = bodyExcerpt(doc('كلمة '.repeat(60)))!
    expect(long.length).toBeLessThanOrEqual(161)
    expect(long.endsWith('كلمة…')).toBe(true)
  })
})
