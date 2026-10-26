import { describe, expect, it } from 'vitest'
import { articleLd, breadcrumbLd, faqLd, serializeLd, touristDestinationLd, websiteLd } from '@/lib/jsonld'

const base = 'https://example.org'

describe('touristDestinationLd', () => {
  it('describes a city in Syria in the page language', () => {
    expect(touristDestinationLd({ base, locale: 'en', path: '/en/cities/aleppo', name: 'Aleppo', description: 'A city of kitchens.' })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'TouristDestination',
      name: 'Aleppo',
      description: 'A city of kitchens.',
      url: `${base}/en/cities/aleppo`,
      inLanguage: 'en',
      containedInPlace: { '@type': 'Country', name: 'Syria' },
    })
  })

  it('adds an absolute image when there is a photo', () => {
    expect(touristDestinationLd({ base, locale: 'ar', path: '/cities/aleppo', name: 'حلب', image: '/api/media/file/a.webp' }).image).toBe(
      `${base}/api/media/file/a.webp`,
    )
  })
})

describe('articleLd', () => {
  it('describes a season report with author, dates and the independent publisher', () => {
    expect(
      articleLd({
        base,
        path: '/seasons/bloudan-2026-12-01',
        headline: 'أول ثلج',
        fieldDate: '2026-12-01T00:00:00.000Z',
        updatedAt: '2026-12-02T08:00:00.000Z',
        authorName: 'مراسل',
      }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'أول ثلج',
      inLanguage: 'ar',
      url: `${base}/seasons/bloudan-2026-12-01`,
      mainEntityOfPage: `${base}/seasons/bloudan-2026-12-01`,
      datePublished: '2026-12-01T00:00:00.000Z',
      dateModified: '2026-12-02T08:00:00.000Z',
      author: { '@type': 'Person', name: 'مراسل' },
      publisher: { '@type': 'Organization', name: 'سوريا عن قرب', url: base },
    })
  })

  it('omits the author when unknown', () => {
    expect(articleLd({ base, path: '/seasons/x', headline: 'x', fieldDate: '2026-12-01' })).not.toHaveProperty('author')
  })
})

describe('serializeLd', () => {
  it('cannot break out of the script element', () => {
    const out = serializeLd({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' })
  })
})

describe('breadcrumbs, FAQ and site', () => {
  it('links every crumb but the current page', () => {
    const ld = breadcrumbLd('https://x.org', [{ name: 'الرئيسية', path: '/' }, { name: 'دمشق' }])
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://x.org/' },
      { '@type': 'ListItem', position: 2, name: 'دمشق' },
    ])
  })
  it('mirrors the visible questions', () => {
    expect(faqLd([{ q: 'س؟', a: 'ج.' }]).mainEntity[0]).toEqual({ '@type': 'Question', name: 'س؟', acceptedAnswer: { '@type': 'Answer', text: 'ج.' } })
  })
  it('names the site in both languages', () => {
    const g = websiteLd('https://x.org')['@graph']
    expect(g[0]?.alternateName).toBe('Syria Up Close')
    expect(g[1]?.logo).toBe('https://x.org/icon.svg')
  })
  it('adds coordinates and the update date when known', () => {
    const ld = touristDestinationLd({ base: 'https://x.org', locale: 'ar', path: '/inside/bloudan', name: 'بلودان', geo: [33.7, 36.1], dateModified: '2026-10-26', attractions: [{ name: 'نبع', geo: [33.71, 36.12] }] })
    expect(ld.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 33.7, longitude: 36.1 })
    expect(ld.dateModified).toBe('2026-10-26')
    expect(ld.includesAttraction?.[0]?.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 33.71, longitude: 36.12 })
  })
})
