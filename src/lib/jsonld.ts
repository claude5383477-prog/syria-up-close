import { siteUrl } from '@/lib/site-url'
import type { Locale } from '@/lib/i18n'

// schema.org structured data (SPEC §5.5): TouristDestination (inside a WebPage) for cities and the
// countryside, Article for season reports.

const abs = (base: string, path: string) => (/^https?:\/\//.test(path) ? path : `${base}${path}`)

export type AttractionLd = { name: string; description?: string; image?: string; geo?: readonly [number, number] }

/**
 * A city or countryside page: a WebPage whose main entity is the TouristDestination.
 * The page language and its last update describe the page (CreativeWork properties), so they sit on the
 * WebPage; TouristDestination is a Place and has neither (validator.schema.org warned, 2026-10-27).
 */
export function touristDestinationLd(o: { base: string; locale: Locale; path: string; name: string; description?: string; image?: string; attractions?: AttractionLd[]; geo?: readonly [number, number]; dateModified?: string }) {
  const url = abs(o.base, o.path)
  const placeId = `${url}#destination`
  const page = {
    '@type': 'WebPage',
    '@id': url,
    url,
    name: o.name,
    inLanguage: o.locale,
    ...(o.dateModified ? { dateModified: o.dateModified } : {}),
    mainEntity: { '@id': placeId },
  }
  const place = {
    '@type': 'TouristDestination',
    '@id': placeId,
    name: o.name,
    ...(o.description ? { description: o.description } : {}),
    url,
    ...(o.image ? { image: abs(o.base, o.image) } : {}),
    containedInPlace: { '@type': 'Country', name: o.locale === 'ar' ? 'سوريا' : 'Syria' },
    ...(o.geo ? { geo: { '@type': 'GeoCoordinates', latitude: o.geo[0], longitude: o.geo[1] } } : {}),
    ...(o.attractions?.length
      ? {
          includesAttraction: o.attractions.map((a) => ({
            '@type': 'TouristAttraction',
            name: a.name,
            ...(a.description ? { description: a.description } : {}),
            ...(a.image ? { image: abs(o.base, a.image) } : {}),
            ...(a.geo ? { geo: { '@type': 'GeoCoordinates', latitude: a.geo[0], longitude: a.geo[1] } } : {}),
          })),
        }
      : {}),
  }
  // A typed pair, so callers (and tests) read each node with its own properties.
  return { '@context': 'https://schema.org', '@graph': [page, place] as [typeof page, typeof place] }
}

export function articleLd(o: {
  base: string
  path: string
  headline: string
  fieldDate: string
  updatedAt?: string
  authorName?: string | null
  image?: string
}) {
  const url = abs(o.base, o.path)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: o.headline,
    inLanguage: 'ar',
    url,
    mainEntityOfPage: url,
    datePublished: o.fieldDate,
    dateModified: o.updatedAt ?? o.fieldDate,
    ...(o.image ? { image: abs(o.base, o.image) } : {}),
    ...(o.authorName ? { author: { '@type': 'Person', name: o.authorName } } : {}),
    publisher: { '@type': 'Organization', name: 'سوريا عن قرب', url: o.base },
  }
}

/** Breadcrumbs for search results: every item but the last has a URL. */
export function breadcrumbLd(base: string, items: { name: string; path?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, ...(it.path ? { item: abs(base, it.path) } : {}) })),
  }
}

/** The page's visible questions and answers (the same text, never extra claims). */
export function faqLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })),
  }
}

/** The site itself, on the home page: name in both languages, logo and the Ahleen partnership. */
export function websiteLd(base: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${base}/#site`, name: 'سوريا عن قرب', alternateName: 'Syria Up Close', url: `${base}/`, inLanguage: ['ar', 'en'] },
      {
        '@type': 'Organization',
        '@id': `${base}/#org`,
        name: 'سوريا عن قرب',
        alternateName: 'Syria Up Close',
        url: `${base}/`,
        logo: `${base}/icon.svg`,
        description: 'دليل سياحي مستقل عن سوريا، بالشراكة مع أهلين. لسنا جهة رسمية.',
      },
    ],
  }
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so content can't close the tag. */
export function serializeLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export const siteBase = () => siteUrl()
