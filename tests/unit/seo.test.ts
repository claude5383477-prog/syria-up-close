import { describe, expect, it } from 'vitest'
import { bodyExcerpt, lexicalText, pageMetadata, sitemapEntry } from '@/lib/seo'

describe('pageMetadata', () => {
  it('bilingual page: canonical in its own language, hreflang ar/en/x-default', () => {
    expect(pageMetadata({ locale: 'en', path: '/cities/damascus', title: 'Damascus', description: 'd' })).toEqual({
      title: 'Damascus',
      description: 'd',
      alternates: {
        canonical: '/en/cities/damascus',
        languages: { ar: '/cities/damascus', en: '/en/cities/damascus', 'x-default': '/cities/damascus' },
      },
      openGraph: { title: 'Damascus', description: 'd', locale: 'en_US', alternateLocale: ['ar_SY'], url: '/en/cities/damascus', type: 'website', siteName: 'Syria Up Close' },
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

  it('pages that must never be indexed', () => {
    expect(pageMetadata({ locale: 'ar', path: '/kit', title: 'Kit', noindex: true }).robots).toEqual({ index: false, follow: false })
  })
})

describe('sitemapEntry', () => {
  const base = 'https://syriaupclose.example'
  it('lists the Arabic URL with language alternates when English is available', () => {
    expect(sitemapEntry(base, '/cities/aleppo', { english: true, lastModified: '2026-10-17T00:00:00.000Z' })).toEqual([
      {
        url: `${base}/cities/aleppo`,
        lastModified: '2026-10-17T00:00:00.000Z',
        alternates: { languages: { ar: `${base}/cities/aleppo`, en: `${base}/en/cities/aleppo` } },
      },
      {
        url: `${base}/en/cities/aleppo`,
        lastModified: '2026-10-17T00:00:00.000Z',
        alternates: { languages: { ar: `${base}/cities/aleppo`, en: `${base}/en/cities/aleppo` } },
      },
    ])
  })

  it('Arabic only (section or untranslated): one URL, no alternates', () => {
    expect(sitemapEntry(base, '/', { english: false })).toEqual([{ url: `${base}/` }])
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
