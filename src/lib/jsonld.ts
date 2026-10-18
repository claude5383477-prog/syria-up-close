import { siteUrl } from '@/lib/site-url'
import type { Locale } from '@/lib/i18n'

// schema.org structured data (SPEC §5.5): TouristDestination for cities, Article for season reports.

const abs = (base: string, path: string) => (/^https?:\/\//.test(path) ? path : `${base}${path}`)

export function touristDestinationLd(o: { base: string; locale: Locale; path: string; name: string; description?: string; image?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: o.name,
    ...(o.description ? { description: o.description } : {}),
    url: abs(o.base, o.path),
    inLanguage: o.locale,
    ...(o.image ? { image: abs(o.base, o.image) } : {}),
    containedInPlace: { '@type': 'Country', name: o.locale === 'ar' ? 'سوريا' : 'Syria' },
  }
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

/** JSON for a <script type="application/ld+json">, with "<" escaped so content can't close the tag. */
export function serializeLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export const siteBase = () => siteUrl()
