import type { Metadata, MetadataRoute } from 'next'
import type { Locale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

// SEO rules (SPEC §5.5): canonical per language, hreflang ar/en/x-default, Arabic-only sections
// have no English alternate, untranslated English pages are noindex until translated (س-9).

const SITE = { ar: 'سوريا عن قرب', en: 'Syria Up Close' } as const
const OG_LOCALE = { ar: 'ar_SY', en: 'en_US' } as const

export type PageSeo = {
  locale: Locale
  /** Language-neutral path, e.g. "/cities/damascus". */
  path: string
  title: string
  description?: string
  /** Section written only in Arabic (/inside, /seasons). */
  arabicOnly?: boolean
  /** False when the English page falls back to Arabic for its main content. */
  translated?: boolean
  /** Never index (internal pages). */
  noindex?: boolean
  /** Use the title without the "· site name" template (home). */
  absoluteTitle?: boolean
}

export function pageMetadata({ locale, path, title, description, arabicOnly, translated = true, noindex, absoluteTitle }: PageSeo): Metadata {
  const ar = localePath('ar', path)
  const en = localePath('en', path)
  const hasEnglish = !arabicOnly && translated
  const canonical = arabicOnly ? ar : localePath(locale, path)
  const m: Metadata = {
    title: absoluteTitle ? { absolute: title } : title,
    ...(description ? { description } : {}),
    alternates: {
      canonical,
      languages: hasEnglish ? { ar, en, 'x-default': ar } : { ar, 'x-default': ar },
    },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[locale === 'ar' ? 'en' : 'ar']],
      url: localePath(locale, path),
      type: 'website',
      siteName: SITE[locale],
    },
    twitter: { card: 'summary_large_image' },
  }
  if (noindex) m.robots = { index: false, follow: false }
  else if (locale === 'en' && !hasEnglish) m.robots = { index: false, follow: true }
  return m
}

/** Sitemap rows for one page: the Arabic URL, plus the English one (with alternates) when it exists. */
export function sitemapEntry(base: string, path: string, opts: { english: boolean; lastModified?: string }): MetadataRoute.Sitemap {
  const ar = `${base}${localePath('ar', path)}`
  const lm = opts.lastModified ? { lastModified: opts.lastModified } : {}
  if (!opts.english) return [{ url: ar, ...lm }]
  const en = `${base}${localePath('en', path)}`
  const alternates = { languages: { ar, en } }
  return [
    { url: ar, ...lm, alternates },
    { url: en, ...lm, alternates },
  ]
}

export const siteName = (locale: Locale) => SITE[locale]

type LexNode = { text?: string; children?: LexNode[] }

/** Plain text of Lexical rich text (paragraphs joined by spaces). */
export function lexicalText(value: unknown): string {
  const out: string[] = []
  const walk = (n: LexNode) => {
    if (typeof n.text === 'string') out.push(n.text)
    for (const c of n.children ?? []) walk(c)
    if (n.children && !n.text) out.push(' ')
  }
  const root = (value as { root?: LexNode } | null)?.root
  if (root) walk(root)
  return out.join('').replace(/\s+/g, ' ').trim()
}

/** Meta description from rich text: ≤ 160 chars, cut at a word boundary. */
export function bodyExcerpt(value: unknown, max = 160): string | undefined {
  const t = lexicalText(value)
  if (!t) return undefined
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).trim()}…`
}
