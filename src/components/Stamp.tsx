import { freshness } from '@/lib/freshness'
import type { Locale } from '@/lib/i18n'

const TEXT = {
  ar: { updated: 'آخر تحديث: ', stale: ' · قد تكون قديمة', pending: 'بانتظار أول تحقق' },
  en: { updated: 'Last updated: ', stale: ' · May be out of date', pending: 'Awaiting first check' },
} as const

const DATE_LOCALE = { ar: 'ar-SY', en: 'en-GB' } as const

export function formatDate(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Damascus',
  }).format(d)
}

/** "Last updated" badge (SPEC §5.1): fresh, stale or pending, derived from verifiedAt. */
export function Stamp({
  verifiedAt,
  maxAgeDays,
  locale,
  now = new Date(),
}: {
  verifiedAt: Date | string | null | undefined
  maxAgeDays: number
  locale: Locale
  now?: Date
}) {
  const state = freshness(verifiedAt, now, maxAgeDays)
  const t = TEXT[locale]
  if (state === 'pending') return <span className="stamp pending">{t.pending}</span>
  const d = new Date(verifiedAt!)
  return (
    <span className={state === 'stale' ? 'stamp stale' : 'stamp'}>
      {t.updated}
      <time dateTime={d.toISOString()}>{formatDate(d, locale)}</time>
      {state === 'stale' && t.stale}
    </span>
  )
}
