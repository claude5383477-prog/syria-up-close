import { describe, expect, it } from 'vitest'
import { articleLd, breadcrumbLd, faqLd, serializeLd, touristDestinationLd, websiteLd } from '@/lib/jsonld'

const base = 'https://example.org'

/** The graph's node of a given type (touristDestinationLd returns a WebPage and a TouristDestination). */
const node = (ld: { '@graph': readonly Record<string, unknown>[] }, type: string) => ld['@graph'].find((n) => n['@type'] === type)

describe('touristDestinationLd', () => {
  it('describes a city in Syria; the page that describes it carries the language', () => {
    expect(touristDestinationLd({ base, locale: 'en', path: '/en/cities/aleppo', name: 'Aleppo', description: 'A city of kitchens.' })).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${base}/en/cities/aleppo`,
          url: `${base}/en/cities/aleppo`,
          name: 'Aleppo',
          inLanguage: 'en',
          mainEntity: { '@id': `${base}/en/cities/aleppo#destination` },
        },
        {
          '@type': 'TouristDestination',
          '@id': `${base}/en/cities/aleppo#destination`,
          name: 'Aleppo',
          description: 'A city of kitchens.',
          url: `${base}/en/cities/aleppo`,
          containedInPlace: { '@type': 'Country', name: 'Syria' },
        },
      ],
    })
  })

  it('adds an absolute image when there is a photo', () => {
    expect(node(touristDestinationLd({ base, locale: 'ar', path: '/cities/aleppo', name: 'حلب', image: '/api/media/file/a.webp' }), 'TouristDestination')?.image).toBe(
      `${base}/api/media/file/a.webp`,
    )
  })

  // Search Console / validator.schema.org, 2026-10-27: inLanguage and dateModified are not properties of
  // TouristDestination (a Place). They describe the page, so they belong to its WebPage (a CreativeWork).
  const ALLOWED: Record<string, string[]> = {
    WebPage: ['@type', '@id', 'url', 'name', 'inLanguage', 'dateModified', 'mainEntity'],
    TouristDestination: ['@type', '@id', 'name', 'description', 'url', 'image', 'containedInPlace', 'geo', 'includesAttraction'],
  }

  for (const locale of ['ar', 'en'] as const) {
    it(`every node carries only its own type's properties, and the page language is ${locale}`, () => {
      const path = locale === 'ar' ? '/inside/bloudan' : '/en/cities/damascus'
      const ld = touristDestinationLd({
        base,
        locale,
        path,
        name: 'x',
        description: 'd',
        image: '/a.webp',
        geo: [33.7, 36.1],
        dateModified: '2026-10-26T10:00:00.000Z',
        attractions: [{ name: 'a', geo: [33.71, 36.12] }],
      })
      expect(ld['@graph'].map((n) => n['@type'])).toEqual(['WebPage', 'TouristDestination'])
      for (const n of ld['@graph']) {
        const allowed = ALLOWED[n['@type'] as string]
        expect(allowed, `unexpected type ${String(n['@type'])}`).toBeDefined()
        expect(Object.keys(n).filter((k) => !allowed!.includes(k))).toEqual([])
      }
      const page = node(ld, 'WebPage')
      expect(page?.inLanguage).toBe(locale)
      expect(page?.dateModified).toBe('2026-10-26T10:00:00.000Z')
      expect(page?.mainEntity).toEqual({ '@id': node(ld, 'TouristDestination')?.['@id'] })
      expect(node(ld, 'TouristDestination')).not.toHaveProperty('inLanguage')
      expect(node(ld, 'TouristDestination')).not.toHaveProperty('dateModified')
    })
  }

  it('leaves dateModified out when the date is unknown', () => {
    expect(node(touristDestinationLd({ base, locale: 'ar', path: '/cities/homs', name: 'حمص' }), 'WebPage')).not.toHaveProperty('dateModified')
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
  it('names the site in both languages, published by the organization, with a square PNG logo', () => {
    const [site, org] = websiteLd('https://x.org')['@graph']
    expect(site).toEqual({
      '@type': 'WebSite',
      '@id': 'https://x.org/#site',
      name: 'سوريا عن قرب',
      alternateName: 'Syria Up Close',
      url: 'https://x.org/',
      inLanguage: ['ar', 'en'],
      publisher: { '@id': 'https://x.org/#org' },
    })
    expect(org).toMatchObject({ '@type': 'Organization', '@id': 'https://x.org/#org', name: 'سوريا عن قرب', alternateName: 'Syria Up Close', url: 'https://x.org/' })
    expect(org?.logo).toEqual({ '@type': 'ImageObject', url: 'https://x.org/icon-512.png', width: 512, height: 512 })
    // No search box markup (Google retired it) and no invented accounts.
    expect(JSON.stringify(site)).not.toContain('SearchAction')
    expect(org).not.toHaveProperty('sameAs')
  })
  it("lists only the accounts from the site settings as sameAs", () => {
    const org = websiteLd('https://x.org', ['https://instagram.com/upclosesyria'])['@graph'][1]
    expect(org?.sameAs).toEqual(['https://instagram.com/upclosesyria'])
  })
  it('adds coordinates and the update date when known', () => {
    const ld = touristDestinationLd({ base: 'https://x.org', locale: 'ar', path: '/inside/bloudan', name: 'بلودان', geo: [33.7, 36.1], dateModified: '2026-10-26', attractions: [{ name: 'نبع', geo: [33.71, 36.12] }] })
    const place = node(ld, 'TouristDestination') as { geo?: unknown; includesAttraction?: { geo?: unknown }[] }
    expect(place.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 33.7, longitude: 36.1 })
    expect(node(ld, 'WebPage')?.dateModified).toBe('2026-10-26')
    expect(place.includesAttraction?.[0]?.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 33.71, longitude: 36.12 })
  })
})
