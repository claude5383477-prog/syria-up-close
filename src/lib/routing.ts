import type { Locale } from '@/lib/i18n'

export type RouteDecision = { type: 'next' } | { type: 'rewrite'; to: string } | { type: 'redirect'; to: string }

const PASSTHROUGH = /^\/(?:admin|api|correspondent|_next)(?:\/|$)/
const EN = /^\/en(?:\/|$)/
const AR = /^\/ar(?:\/|$)/
const ARABIC_ONLY = /^(?:\/en)?\/(?:inside|seasons)(?:\/|$)/

/** Arabic lives at unprefixed URLs (rewritten to [locale]=ar), English under /en. SPEC §5.1. */
export function resolveRoute(pathname: string): RouteDecision {
  if (PASSTHROUGH.test(pathname) || EN.test(pathname)) return { type: 'next' }
  if (AR.test(pathname)) return { type: 'redirect', to: pathname.slice(3) || '/' }
  return { type: 'rewrite', to: pathname === '/' ? '/ar' : `/ar${pathname}` }
}

/**
 * Pages are prerendered under the internal route (/ar/...), so usePathname() can return that form
 * on the server. Map it back to the public URL before building links or highlighting the nav.
 */
export function publicPath(pathname: string): string {
  return AR.test(pathname) ? pathname.slice(3) || '/' : pathname
}

export function localePath(locale: Locale, path: string): string {
  if (locale === 'ar') return path
  return path === '/' ? '/en' : `/en${path}`
}

/** The same page in the other language, from a public (browser) pathname. */
export function switchLocalePath(pathname: string): string {
  if (EN.test(pathname)) return pathname.slice(3) || '/'
  return localePath('en', pathname)
}

/** Sections written only for people inside Syria (SPEC §5.1). */
export function isArabicOnly(pathname: string): boolean {
  return ARABIC_ONLY.test(pathname)
}
