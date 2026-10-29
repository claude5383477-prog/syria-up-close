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

/**
 * The site itself, on the home page: WebSite published by the Organization (linked by @id), the name in
 * Arabic with the English one as alternateName, a square PNG logo (Google does not use SVG logos), and
 * sameAs only for accounts the editors have listed in the site settings.
 */
export function websiteLd(base: string, sameAs: readonly string[] = []) {
  const orgId = `${base}/#org`
  const site = { '@type': 'WebSite', '@id': `${base}/#site`, name: 'سوريا عن قرب', alternateName: 'Syria Up Close', url: `${base}/`, inLanguage: ['ar', 'en'], publisher: { '@id': orgId } }
  const org = {
    '@type': 'Organization',
    '@id': orgId,
    name: 'سوريا عن قرب',
    alternateName: 'Syria Up Close',
    url: `${base}/`,
    logo: { '@type': 'ImageObject', url: `${base}/icon-512.png`, width: 512, height: 512 },
    description: 'دليل سياحي مستقل عن سوريا، بالشراكة مع أهلين. لسنا جهة رسمية.',
    ...(sameAs.length ? { sameAs: [...sameAs] } : {}),
  }
  return { '@context': 'https://schema.org', '@graph': [site, org] as [typeof site, typeof org] }
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so content can't close the tag. */
export function serializeLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export const siteBase = () => siteUrl()

export type VideoLd = { anchor: string; name: string; author: string; thumbnail?: string; embedUrl: string; contentUrl: string; uploadDate?: string; duration?: string }

/** "عدسات": one VideoObject per video (batch 4), each with its own anchor on the page. */
export function videoObjectsLd(o: { base: string; path: string; videos: VideoLd[] }) {
  const url = abs(o.base, o.path)
  return {
    '@context': 'https://schema.org',
    '@graph': o.videos.map((v) => ({
      '@type': 'VideoObject',
      '@id': `${url}#${v.anchor}`,
      url: `${url}#${v.anchor}`,
      name: v.name,
      ...(v.thumbnail ? { thumbnailUrl: abs(o.base, v.thumbnail) } : {}),
      ...(v.uploadDate ? { uploadDate: v.uploadDate } : {}),
      ...(v.duration ? { duration: v.duration } : {}),
      embedUrl: v.embedUrl,
      contentUrl: v.contentUrl,
      creator: { '@type': 'Person', name: v.author },
    })),
  }
}
