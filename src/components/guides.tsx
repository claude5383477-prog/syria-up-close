import Image from 'next/image'
import Link from 'next/link'
import { formatDate } from '@/components/Stamp'
import { asDoc, asMedia, type GuideDoc } from '@/data/queries'
import { TOUR_LANGUAGES, type TourLanguage } from '@/lib/booking'
import type { Locale } from '@/lib/i18n'
import { text } from '@/lib/localized'
import { localePath } from '@/lib/routing'

const AVATAR_PATTERNS = ['khatam', 'mash', 'aleppo', 'muq'] as const

export const langLabel = (l: string, locale: Locale) => TOUR_LANGUAGES[l as TourLanguage]?.[locale] ?? l

/** A guide's interests in the page language (a hasMany localized text comes back as { ar: [...], en: [...] }). */
export function interestsOf(g: GuideDoc, locale: Locale): string[] {
  const v = g.interests as { ar?: string[]; en?: string[] } | string[] | null | undefined
  if (Array.isArray(v)) return v
  return (v?.[locale]?.length ? v[locale] : v?.ar) ?? []
}

export function GuideAvatar({ g, size = 72, name }: { g: GuideDoc; size?: number; name: string }) {
  const m = asMedia(g.photo)
  const src = m?.sizes?.thumb?.url ?? m?.url
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {src ? (
        <Image src={src} alt={name} fill sizes={`${size}px`} />
      ) : (
        <svg viewBox="0 0 72 72" aria-hidden="true" focusable="false">
          <rect width="72" height="72" fill="#E8DCC8" />
          <rect width="72" height="72" fill={`url(#syr-${AVATAR_PATTERNS[g.id % 4]})`} opacity=".5" />
          <circle cx="36" cy="30" r="13" fill="#FBF8F2" />
          <path d="M12 72c3-16 13-24 24-24s21 8 24 24" fill="#FBF8F2" />
        </svg>
      )}
    </span>
  )
}

export function Verified({ at, locale, long }: { at?: string | null; locale: Locale; long?: boolean }) {
  if (!at) return null
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  return (
    <span className="verified">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M5 12l5 5L20 7" />
      </svg>
      {T('تحقّق منه الفريق', 'Checked by our team')}
      {long && <> · {T('آخر تحقق', 'last checked')} <time dateTime={at}>{formatDate(new Date(at), locale)}</time></>}
    </span>
  )
}

export function GuideCard({ g, locale }: { g: GuideDoc; locale: Locale }) {
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const name = text(g.name, locale) ?? text(g.name, 'ar') ?? ''
  const href = localePath(locale, `/guides/${g.slug}`)
  const city = asDoc(g.city)
  return (
    <article className="gcard">
      <div className="top">
        <GuideAvatar g={g} name={name} />
        <div style={{ minWidth: 0 }}>
          <h3>{name}</h3>
          <Verified at={g.verifiedAt} locale={locale} />
        </div>
      </div>
      <div className="b">
        <span className="muted">{[city && text(city.name, locale), text(g.area, locale)].filter(Boolean).join(' · ')}</span>
        <div className="langs">
          {(g.languages ?? []).map((l) => (
            <span key={l} className="tag sand" >
              {langLabel(l, locale)}
            </span>
          ))}
        </div>
        <div className="langs">
          {interestsOf(g, locale).map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
        <div className="row">
          <Link className="btn-pill small" href={`${href}#book`}>
            {T('احجز', 'Book')}
          </Link>
          <Link className="btn-pill small ghost" href={href}>
            {T('الملف', 'Profile')}
          </Link>
        </div>
      </div>
    </article>
  )
}

/** A dashed card where guides will appear: never a made-up guide (content rule ق1). */
export function GuideSlot({ locale, city }: { locale: Locale; city?: string }) {
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  return (
    <article className="gcard slot">
      <div className="b">
        <h3>{city ? T(`أول دليل في ${city}`, `The first guide in ${city}`) : T('أول دليل', 'The first guide')}</h3>
        <p className="muted">{T('بانتظار تحقق الفريق: منتعرّف على كل دليل ومنتأكد منه قبل ما ننشر ملفه.', 'Awaiting our team’s check: we meet every guide before publishing their profile.')}</p>
      </div>
    </article>
  )
}
