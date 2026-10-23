import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Locale } from '@/lib/i18n'

export function ButtonLink({ href, ghost, children }: { href: string; ghost?: boolean; children: ReactNode }) {
  return (
    <Link className={ghost ? 'btn ghost' : 'btn'} href={href}>
      {children}
    </Link>
  )
}

export function Chip({ kind, children }: { kind: 'city' | 'cat' | 'aud'; children: ReactNode }) {
  return <span className={`chip ${kind}`}>{children}</span>
}

/** Hatched stand-in for a correspondent photo; the shot note doubles as the accessible name. */
export function PhotoPlaceholder({ shot, tall }: { shot: string; tall?: boolean }) {
  return (
    <div className={tall ? 'ph tall' : 'ph'} role="img" aria-label={shot}>
      <span className="shot" aria-hidden="true">
        {shot}
      </span>
    </div>
  )
}

/** Card as in the prototype: media, then an optional eyebrow (chips), then the title and body. */
export function Card({
  title,
  href,
  media,
  eyebrow,
  children,
}: {
  title: ReactNode
  href?: string
  media?: ReactNode
  eyebrow?: ReactNode
  children?: ReactNode
}) {
  const body = (
    <>
      {media}
      {eyebrow}
      <h3>{title}</h3>
      {children}
    </>
  )
  return href ? (
    <Link className="card" href={href}>
      {body}
    </Link>
  ) : (
    <div className="card">{body}</div>
  )
}

export function SoonTag({ locale }: { locale: Locale }) {
  return <span className="soon">{locale === 'ar' ? 'قريباً' : 'Soon'}</span>
}

const STAY_TEXT = {
  ar: {
    shot: 'صورة من الإقامة نفسها',
    chip: 'أين تقيم',
    title: (c: string) => `إقامات في ${c}`,
    body: 'فنادق وبيوت ريفية بصور حقيقية عبر شريكنا أهلين.',
    cta: 'احجز الإقامة عبر أهلين',
    how: 'كيف تعمل الشراكة',
    newTab: '(يفتح في نافذة جديدة)',
  },
  en: {
    shot: 'Photo of the stay itself',
    chip: 'Where to stay',
    title: (c: string) => `Stays in ${c}`,
    body: 'Hotels and rural homes with real photos, through our partner Ahleen.',
    cta: 'Book a stay with Ahleen',
    how: 'How the partnership works',
    newTab: '(opens in a new tab)',
  },
} as const

/**
 * The generic "where to stay" card for a city with no hotels listed yet (content rule ق5).
 * Callers pass the URL, rel and disclosure from siteSettings; it never hard-codes them.
 */
export function StayCard({
  locale,
  cityName,
  href,
  rel,
  disclosure,
  aboutHref,
  media,
  title,
  body,
}: {
  locale: Locale
  cityName: string
  href: string
  rel: string
  disclosure: string
  aboutHref: string
  media?: ReactNode
  /** A specific stay's name; defaults to "Stays in {city}". */
  title?: string
  body?: string
}) {
  const t = STAY_TEXT[locale]
  return (
    <div className="stay">
      {media ?? <PhotoPlaceholder shot={t.shot} />}
      <div className="body">
        <Chip kind="cat">{t.chip}</Chip>
        <h3>{title ?? t.title(cityName)}</h3>
        <p>{body ?? t.body}</p>
        <a className="btn" href={href} target="_blank" rel={rel}>
          {t.cta} <span aria-hidden="true">↗</span>
          <span className="sr-only">{t.newTab}</span>
        </a>
        <span className="disclose">
          {disclosure} <Link href={aboutHref}>{t.how}</Link>
        </span>
      </div>
    </div>
  )
}
