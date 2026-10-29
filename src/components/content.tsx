import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Stamp, formatDate } from '@/components/Stamp'
import { PhotoPlaceholder, StayCard } from '@/components/ui'
import type { Locale } from '@/lib/i18n'
import { breadcrumbLd, serializeLd, siteBase } from '@/lib/jsonld'
import { pick, text } from '@/lib/localized'
import { asDoc, asMedia, type CityDoc, type L, type ReportDoc, type SettingsDoc, type StatusDoc, type StayDoc } from '@/data/queries'
import { localePath } from '@/lib/routing'
import { archiveLabel, staticPhoto } from '@/content/photos'
import { GUIDE } from '@/content/guide'
import { splitStays } from '@/lib/stays'
import { ShowMore } from '@/components/client/ShowMore'
import { ahleenCityUrl, withUtm } from '@/lib/rural'
import type { Media } from '@/payload-types'
import { heroSizes, type HeroLayer } from '@/lib/heroSizes'

/** Re-exported for pages that already import from here; lives in lib/localized (no UI imports). */
export { text }

/**
 * Renders a localized field. When English is missing it shows the Arabic text inside an element
 * marked lang="ar" dir="rtl" (SPEC §10 س-9).
 */
export function Loc({ v, locale, as: Tag = 'span' }: { v: L; locale: Locale; as?: 'span' | 'p' | 'div' }) {
  const p = pick<string>(v, locale)
  if (!p) return null
  return p.lang === locale ? <>{p.value}</> : <Tag lang="ar" dir="rtl">{p.value}</Tag>
}

/** Card grids: full width on phones, two columns on tablets, three on desktop. */
const CARD_SIZES = '(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw'
const LCP = { loading: 'eager', fetchPriority: 'high' } as const

/**
 * A correspondent photo when there is one, otherwise the hatched placeholder with the shot note.
 * `priority` marks the page's LCP image: fetched first (`fetchPriority="high"`) and never lazy. The
 * Next 16 docs prefer this to `preload` when the image is already in the server HTML, as ours are.
 * `layer` places it in a hero box (lib/heroSizes), so `sizes` matches the width it is drawn at.
 */
export function Photo({ media, shot, tall, size = 'card', priority, layer, fallback, locale = 'ar' }: { media?: Media | number | null; shot: string; tall?: boolean; size?: 'thumb' | 'card' | 'hero'; priority?: boolean; layer?: HeroLayer; fallback?: string; locale?: Locale }) {
  const m = asMedia(media)
  const file = m?.sizes?.[size]
  const src = file?.url ?? m?.url
  if (!m || !src) {
    // No correspondent photo yet: a guide photo (owner's collection or Commons, credited) before the placeholder.
    const sp = staticPhoto(fallback)
    if (!sp) return <PhotoPlaceholder shot={shot} tall={tall} />
    const sizes = layer ? heroSizes(layer, sp.w / sp.h) : CARD_SIZES
    return (
      <div className={tall ? 'photo tall' : 'photo'}>
        {/* Commons thumbnails load straight from Wikimedia (already sized), the rest go through the optimizer. */}
        <Image src={sp.src} alt={shot} fill sizes={sizes} {...(priority ? LCP : {})} unoptimized={sp.src.startsWith('https://')} />
        {archiveLabel(sp, locale) && <span className="archive-tag">{archiveLabel(sp, locale)}</span>}
        <span className="credit" lang="en">
          {sp.credit}
        </span>
      </div>
    )
  }
  const alt = text(m.alt, 'ar') ?? shot
  const w = file?.url ? file.width : m.width
  const h = file?.url ? file.height : m.height
  const sizes = layer ? heroSizes(layer, w && h ? w / h : null) : CARD_SIZES
  return (
    <div className={tall ? 'photo tall' : 'photo'}>
      <Image src={src} alt={alt} fill sizes={sizes} {...(priority ? LCP : {})} />
    </div>
  )
}

export function CityCards({ cities, locale }: { cities: CityDoc[]; locale: Locale }) {
  return (
    <div className="cards c4 city-grid">
      {cities.map((c, i) => (
        <Link key={c.id} className="pcard lift" href={localePath(locale, `/cities/${c.slug}`)}>
          <span className="media">
            <Photo media={c.coverImage} shot={text(c.coverShotNote, locale) ?? ''} fallback={GUIDE[c.slug]?.gallery[0]} />
            <span className="num">{String(i + 1).padStart(2, '0')}</span>
          </span>
          <span className="body">
            <span className="meta">
              <Loc v={c.tag} locale={locale} />
            </span>
            <h2 className="title">
              <Loc v={c.name} locale={locale} />
            </h2>
            <p>
              <Loc v={c.lede} locale={locale} />
            </p>
          </span>
        </Link>
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
    <div className="status-grid" data-testid="status-board">
      {STATUS_TYPES.map(([type, label]) => {
        const item = byType.get(type)
        return (
          <div className="scard" key={type} data-status={type}>
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
      <div className="status-foot">
        {locale === 'ar'
          ? 'كل بند يحمل اسم من تحقق منه وتاريخ التحقق. لا نكتب عن الأمان، بل وقائع مؤرخة مع رابط المصدر الرسمي.'
          : "Every line carries who checked it and when. We don't make safety claims, only dated facts with a link to the official source."}
      </div>
    </div>
  )
}

const HOTEL_TEXT = {
  ar: {
    on: 'على أهلين',
    off: 'غير مدرج في أهلين',
    book: 'احجز عبر أهلين',
    all: (c: string) => `كل إقامات ${c} على أهلين`,
    newTab: '(يفتح في نافذة جديدة)',
    how: 'كيف تعمل الشراكة',
    more: 'عرض كل الفنادق ({n})',
    less: 'عرض أقل',
  },
  en: {
    on: 'On Ahleen',
    off: 'Not on Ahleen',
    book: 'Book on Ahleen',
    all: (c: string) => `All stays in ${c} on Ahleen`,
    newTab: '(opens in a new tab)',
    how: 'How the partnership works',
    more: 'Show all hotels ({n})',
    less: 'Show fewer',
  },
} as const

/**
 * A city's hotels (ق5). Hotels listed on Ahleen get a booking button to their own Ahleen page;
 * hotels that are not on Ahleen are shown for information only, with no link at all. Then a link to
 * the city's page on Ahleen and the disclosure line. With no hotels yet, the generic stay card.
 */
export function Stays({ stays, settings, cityName, locale, fallback, citySlug }: { stays: StayDoc[]; settings: SettingsDoc; cityName: string; locale: Locale; fallback?: string; citySlug?: string }) {
  const { hotels, cityPage: stored } = splitStays(stays)
  // "All stays in X" goes to X's page on Ahleen, never Ahleen's home page; every partner link carries UTM tags.
  const campaign = `city-${citySlug ?? 'site'}`
  const cityPage = withUtm(stored ?? (citySlug ? ahleenCityUrl(settings.ahleenBaseUrl, citySlug) : settings.ahleenBaseUrl), campaign)
  const disclosure = text(settings.disclosureText, locale) ?? ''
  const aboutHref = localePath(locale, '/about')
  const t = HOTEL_TEXT[locale]
  if (hotels.length === 0) {
    return <StayCard locale={locale} rel={settings.partnerLinkRel} disclosure={disclosure} aboutHref={aboutHref} cityName={cityName} href={cityPage} media={fallback ? <Photo shot={cityName} fallback={fallback} /> : undefined} />
  }
  return (
    <div className="stack" style={{ gap: 18 }}>
      <ShowMore className="hotel-cards" more={t.more} less={t.less}>
        {[...hotels].sort((x, y) => Number(!!y.ahleenUrl) - Number(!!x.ahleenUrl) || Number(x.id) - Number(y.id)).map((h) => (
          <div key={h.id} className={h.ahleenUrl ? 'hotel lift' : 'hotel off'}>
            {/* A hotel listed only for information has no photo of its own: no stand-in city photo repeated on every card. */}
            {(h.image || h.ahleenUrl) && <Photo media={h.image} shot={text(h.title, locale) ?? ''} fallback={fallback} />}
            <span className={h.ahleenUrl ? 'tag' : 'tag muted'}>{h.ahleenUrl ? t.on : t.off}</span>
            <h3 className="title">
              <Loc v={h.title} locale={locale} />
            </h3>
            {text(h.description, locale) && (
              <p>
                <Loc v={h.description} locale={locale} />
              </p>
            )}
            {h.ahleenUrl && (
              <a className="btn" href={withUtm(h.ahleenUrl, campaign)} target="_blank" rel={settings.partnerLinkRel}>
                {t.book} <span aria-hidden="true">↗</span>
                <span className="sr-only">{t.newTab}</span>
              </a>
            )}
          </div>
        ))}
      </ShowMore>
      <a className="link" href={cityPage} target="_blank" rel={settings.partnerLinkRel} style={{ justifySelf: 'start' }}>
        {t.all(cityName)} <span aria-hidden="true">↗</span>
        <span className="sr-only">{t.newTab}</span>
      </a>
      <span className="disclose">
        {disclosure} <Link href={aboutHref}>{t.how}</Link>
      </span>
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

/**
 * The visible breadcrumb trail and its BreadcrumbList, from the same items, so the two always match
 * (SEO day 4). `name` is the plain text for the schema when the label is not a string.
 */
export function Crumbs({ items }: { items: { href?: string; label: ReactNode; name?: string }[] }) {
  const names = items.map((it) => it.name ?? (typeof it.label === 'string' ? it.label : null))
  return (
    <>
      {names.every((n): n is string => Boolean(n)) && <JsonLd data={breadcrumbLd(siteBase(), items.map((it, i) => ({ name: names[i] as string, ...(it.href ? { path: it.href } : {}) })))} />}
      <nav className="crumbs" aria-label="breadcrumbs">
        {items.map((it, i) => (
          <span key={i}>
            {i > 0 && ' / '}
            {it.href ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
          </span>
        ))}
      </nav>
    </>
  )
}

/**
 * Descriptive links to related pages built from existing data (SEO day 4: no orphan pages). Renders
 * nothing when there is nothing to link.
 */
export function RelatedLinks({ id, kicker, title, links, lang }: { id: string; kicker?: string; title: string; links: { href: string; label: string }[]; lang?: Locale }) {
  if (links.length === 0) return null
  return (
    <section className="sec related" aria-labelledby={`${id}-h`} {...(lang ? { lang } : {})}>
      <div className="wrap" style={{ paddingBlock: 16 }}>
        {kicker && <span className="eyebrow">{kicker}</span>}
        <h2 id={`${id}-h`}>{title}</h2>
        <ul className="pills related-links">
          {links.map((l) => (
            <li key={l.href}>
              <Link className="pill" href={l.href}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
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
