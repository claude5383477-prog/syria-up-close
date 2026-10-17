import type { Locale } from '@/lib/i18n'

// Pages fetch with Payload `locale: 'all'`, so localized fields arrive as { ar, en }.
// SPEC §5.3 / س-9: show English when present, otherwise the Arabic text marked lang="ar".

export type Picked<T> = { value: T; lang: Locale }

const isLocaleMap = (v: unknown): v is Partial<Record<Locale, unknown>> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).every((k) => k === 'ar' || k === 'en')

function isEmpty(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (typeof v === 'object' && 'root' in v) {
    const children = (v as { root?: { children?: unknown[] } }).root?.children
    return !children || children.length === 0
  }
  return false
}

export function pick<T = string>(v: unknown, locale: Locale): Picked<T> | null {
  if (isLocaleMap(v)) {
    if (!isEmpty(v[locale])) return { value: v[locale] as T, lang: locale }
    if (!isEmpty(v.ar)) return { value: v.ar as T, lang: 'ar' }
    return null
  }
  return isEmpty(v) ? null : { value: v as T, lang: locale }
}

/** True when every given localized main field exists in `locale` (Arabic is always complete). */
export function isTranslated(values: unknown[], locale: Locale): boolean {
  if (locale === 'ar') return true
  return values.every((v) => !isLocaleMap(v) || !isEmpty(v[locale]) || isEmpty(v.ar))
}
