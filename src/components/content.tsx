import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Stamp, formatDate } from '@/components/Stamp'
import { Card, Chip, PhotoPlaceholder, StayCard } from '@/components/ui'
import type { Locale } from '@/lib/i18n'
import { serializeLd } from '@/lib/jsonld'
import { pick } from '@/lib/localized'
import { asDoc, asMedia, type CityDoc, type L, type ReportDoc, type SettingsDoc, type StatusDoc, type StayDoc } from '@/data/queries'
import { localePath } from '@/lib/routing'
import type { Media } from '@/payload-types'

/** Plain text of a localized field; null when empty. */
export function text(v: L, locale: Locale): string | null {
  const p = pick<string>(v, locale)
  return p ? String(p.value) : null
}

/**
 * Renders a localized field. When English is missing it shows the Arabic text inside an element
 * marked lang="ar" dir="rtl" (SPEC §10 س-9).
 */
export function Loc({ v, locale, as: Tag = 'span' }: { v: L; locale: Locale; as?: 'span' | 'p' | 'div' }) {
  const p = pick<string>(v, locale)
  if (!p) return null
  return p.lang === locale ? <>{p.value}</> : <Tag lang="ar" dir="rtl">{p.value}</Tag>
}

/** A correspondent photo when there is one, otherwise the hatched placeholder with the shot note. */
export function Photo({ media, shot, tall, size = 'card', priority }: { media?: Media | number | null; shot: string; tall?: boolean; size?: 'thumb' | 'card' | 'hero'; priority?: boolean }) {
  const m = asMedia(media)
  const src = m?.sizes?.[size]?.url ?? m?.url
  if (!m || !src) return <PhotoPlaceholder shot={shot} tall={tall} />
  const alt = text(m.alt, 'ar') ?? shot
  return (
    <div className={tall ? 'photo tall' : 'photo'}>
      <Image src={src} alt={alt} fill sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw" priority={priority} />
    </div>
  )
}

export function CityCards({ cities, locale }: { cities: CityDoc[]; locale: Locale }) {
  return (
    <div className="grid g4">
      {cities.map((c) => (
        <Card
          key={c.id}
          href={localePath(locale, `/cities/${c.slug}`)}
          title={<Loc v={c.name} locale={locale} />}
          media={<Photo media={c.coverImage} shot={text(c.coverShotNote, locale) ?? ''} tall />}
          eyebrow={
            <div className="chips">
              <Chip kind="city">
                <Loc v={c.name} locale={locale} />
              </Chip>
            </div>
          }
        >
          <p>
            <Loc v={c.tag} locale={locale} />
          </p>
        </Card>
      ))}
    </div>
  )
}

const STATUS_TYPES = [
  ['electricity', { ar: 'الكهرباء', en: 'Electricity' }],
  ['internet', { ar: 'الإنترنت', en: 'Internet' }],
  ['roads', { ar: 'الطرق', en: 'Roads' }],
  ['weather', { ar: 'الطقس', en: 'Weather' }],
  ['events', { ar: 'الفعاليات', en: 'Events' }],
] as const

/** "Status today": one row per type; empty rows say who will fill them (ق2), filled rows carry who/when (ق3). */
export function StatusBoard({
  cityName,
  items,
  locale,
  maxAgeDays,
  now = new Date(),
}: {
  cityName: string
  items: StatusDoc[]
  locale: Locale
  maxAgeDays: number
  now?: Date
}) {
  const byType = new Map(items.map((i) => [i.type, i]))
  return (
    <div className="board" data-testid="status-board">
      {STATUS_TYPES.map(([type, label]) => {
        const item = byType.get(type)
        return (
          <div className="row" key={type} data-status={type}>
            <span className="k">{label[locale]}</span>
            <span className="v">
              {item ? (
                <>
                  <Loc v={item.value} locale={locale} />
                  {item.verifiedByName && (
                    <span className="by">
                      {locale === 'ar' ? 'تحقق منه: ' : 'Checked by: '}
                      {item.verifiedByName}
                      {item.sourceUrl && (
                        <>
                          {' · '}
                          <a href={item.sourceUrl} rel="noopener" target="_blank">
                            {locale === 'ar' ? 'المصدر' : 'Source'}
                          </a>
                        </>
                      )}
                    </span>
                  )}
                </>
              ) : locale === 'ar' ? (
                `ينشر مراسل ${cityName} الحالة هنا مع اسمه وتاريخ التحقق.`
              ) : (
                `Our ${cityName} correspondent posts the status here, signed and dated.`
              )}
            </span>
            <Stamp verifiedAt={item?.verifiedAt ?? null} maxAgeDays={maxAgeDays} locale={locale} now={now} />
          </div>
        )
      })}
      <div className="board-foot">
        {locale === 'ar'
          ? 'كل بند يحمل اسم من تحقق منه وتاريخ التحقق. لا نكتب عن الأمان، بل وقائع مؤرخة مع رابط المصدر الرسمي.'
          : "Every line carries who checked it and when. We don't make safety claims, only dated facts with a link to the official source."}
      </div>
    </div>
  )
}

/** "Where to stay" (ق5): the city's stays if any, otherwise the generic partner card. Settings drive URL, rel and disclosure. */
export function Stays({ stays, settings, cityName, locale }: { stays: StayDoc[]; settings: SettingsDoc; cityName: string; locale: Locale }) {
  const common = {
    locale,
    rel: settings.partnerLinkRel,
    disclosure: text(settings.disclosureText, locale) ?? '',
    aboutHref: localePath(locale, '/about'),
  }
  if (stays.length === 0) return <StayCard {...common} cityName={cityName} href={settings.ahleenBaseUrl} />
  return (
    <div className="stack">
      {stays.map((s) => (
        <StayCard
          key={s.id}
          {...common}
          cityName={cityName}
          title={text(s.title, locale) ?? undefined}
          body={text(s.description, locale) ?? undefined}
          href={s.ahleenUrl}
          media={s.image ? <Photo media={s.image} shot={text(s.title, locale) ?? ''} /> : undefined}
        />
      ))}
    </div>
  )
}

export function SectionHead({ title, lede, link, as: H = 'h2' }: { title: ReactNode; lede?: ReactNode; link?: ReactNode; as?: 'h1' | 'h2' }) {
  return (
    <div className="s-head">
      <div>
        <H>{title}</H>
        {lede && <p>{lede}</p>}
      </div>
      {link}
    </div>
  )
}

export function Crumbs({ items }: { items: { href?: string; label: ReactNode }[] }) {
  return (
    <nav className="crumbs" aria-label="breadcrumbs">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && ' / '}
          {it.href ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}

/**
 * Latest season reports (Arabic only). Empty state invents nothing (ق2): it says the first report
 * of each season will appear here.
 */
export function ReportList({ reports, locale }: { reports: ReportDoc[]; locale: Locale }) {
  if (reports.length === 0) {
    return (
      <div className="list">
        <div className="li">
          <div>
            <b>لا تقارير منشورة بعد</b>
            <span>ينشر المراسلون هنا تقارير قصيرة بتاريخها: ثلج، قطاف، زهر.</span>
          </div>
          <span className="stamp pending">أول تقرير بموسمه</span>
        </div>
      </div>
    )
  }
  return (
    <div className="list" lang="ar" dir="rtl">
      {reports.map((r) => {
        const city = asDoc(r.city)
        return (
          <div className="li" key={r.id}>
            <div>
              <Link className="title" href={localePath(locale, `/seasons/${r.slug}`)}>
                <b>{r.title}</b>
              </Link>
              <span>
                {city && text(city.name, 'ar')}
                {r.authorName && ` · ${r.authorName}`}
              </span>
            </div>
            <span className="stamp">
              <time dateTime={r.fieldDate}>{formatDate(new Date(r.fieldDate), 'ar')}</time>
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** schema.org data for the page (escaped by serializeLd). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeLd(data) }} />
}
