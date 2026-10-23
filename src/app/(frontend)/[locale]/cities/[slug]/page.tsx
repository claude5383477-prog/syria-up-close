import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Crumbs, JsonLd, Loc, Photo, SectionHead, StatusBoard, Stays, text } from '@/components/content'
import { siteBase, touristDestinationLd } from '@/lib/jsonld'
import { Card, Chip, SoonTag } from '@/components/ui'
import type { CSSProperties } from 'react'
import { PatternBand, PatternDefs, PatternFill } from '@/components/Patterns'
import { Filterable } from '@/components/client/Filterable'
import { Gallery } from '@/components/client/Gallery'
import { Lore } from '@/components/client/Lore'
import { archClip, cityTheme } from '@/lib/cityTheme'
import { isLocale, type Locale } from '@/lib/i18n'
import { isTranslated } from '@/lib/localized'
import { asMedia, getCities, getCity, getCityLore, getCityPhotos, getPlaces, getSettings, getStatusItems, getStays, getVenues, type VenueDoc } from '@/data/queries'
import { formatDate } from '@/components/Stamp'
import { localePath } from '@/lib/routing'
import { mark } from '@/lib/timing'

mark('module cities/[slug] loaded')

// Hourly regeneration lets "may be out of date" appear without anyone publishing (SPEC §5.3);
// publishing anything revalidates immediately (hooks/revalidate).
export const revalidate = 3600

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const cities = await getCities()
  return cities.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const city = isLocale(locale) ? await getCity(slug) : null
  if (!city || !isLocale(locale)) return {}
  const name = text(city.name, locale) ?? slug
  return pageMetadata({
    locale,
    path: `/cities/${slug}`,
    // Search intent: what to see and where to stay; the template adds "· سوريا عن قرب".
    title: locale === 'ar' ? `${name}: معالم وأماكن وأين تقيم` : `${name}: things to see and where to stay`,
    description: text(city.lede, locale) ?? undefined,
    // English page with untranslated main content stays out of the index until translated (س-9).
    translated: isTranslated([city.name, city.lede], 'en'),
    ownImage: true,
  })
}

const KIND = {
  restaurant: { ar: 'مطعم', en: 'Restaurant' },
  cafe: { ar: 'كافيه', en: 'Cafe' },
  sweets: { ar: 'حلويات', en: 'Sweets' },
  park: { ar: 'حديقة', en: 'Park' },
} as const

function VenueCard({ v, locale }: { v: VenueDoc; locale: Locale }) {
  return (
    <div className="hotel lift">
      <Photo media={v.image} shot={text(v.name, locale) ?? ''} />
      <span className="tag">{KIND[v.kind][locale]}</span>
      <h3>
        <Loc v={v.name} locale={locale} />
      </h3>
      {(text(v.neighbourhood, locale) || text(v.note, locale)) && (
        <p>
          <Loc v={v.neighbourhood} locale={locale} />
          {text(v.neighbourhood, locale) && text(v.note, locale) && ' · '}
          <Loc v={v.note} locale={locale} />
        </p>
      )}
    </div>
  )
}

export default async function CityPage({ params }: Props) {
  const { locale: l, slug } = await params
  mark(`render cities/${JSON.stringify(slug)}`)
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const city = await getCity(slug)
  if (!city) notFound()

  const [places, items, stays, settings, venues, lore, photos] = await Promise.all([
    getPlaces(city.id),
    getStatusItems(city.id),
    getStays(city.id),
    getSettings(),
    getVenues(city.id),
    getCityLore(city.id),
    getCityPhotos(city.id),
  ])
  const name = text(city.name, locale) ?? slug
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const theme = cityTheme(slug)
  const eating = venues.filter((v) => v.kind !== 'park')
  const parks = venues.filter((v) => v.kind === 'park')
  const gallery = photos.flatMap((ph) => {
    const m = asMedia(ph.photo)
    const src = m?.sizes?.card?.url ?? m?.url
    if (!m || !src) return []
    const caption = text(ph.caption, locale) ?? text(m.alt, locale) ?? name
    const meta = [ph.credit ?? m.credit, ph.shotDate ? formatDate(new Date(ph.shotDate), locale) : null].filter(Boolean).join(' · ')
    return [{ id: ph.id, src, full: m.sizes?.hero?.url ?? m.url ?? src, alt: caption, caption, meta }]
  })
  const tabs: [string, string][] = [
    ['status', T('حال البلد اليوم', 'Status today')],
    ['arch', T('العمارة', 'Architecture')],
    ['sights', T('المعالم', 'Sights')],
    ['secrets', T('أسرار ونهفات', 'Lore')],
    ['food', T('مطاعم وكافيهات', 'Food')],
    ['parks', T('الحدائق', 'Parks')],
    ['gallery', T('معرض الصور', 'Gallery')],
    ['stay', T('الفنادق', 'Hotels')],
  ]

  return (
    <Page locale={locale} path={`/cities/${slug}`}>
      <JsonLd
        data={touristDestinationLd({
          base: siteBase(),
          locale,
          path: localePath(locale, `/cities/${slug}`),
          name,
          description: text(city.lede, locale) ?? undefined,
          image: asMedia(city.coverImage)?.sizes?.hero?.url ?? asMedia(city.coverImage)?.url ?? undefined,
          attractions: places.map((p) => ({
            name: text(p.title, locale) ?? '',
            description: text(p.description, locale) ?? undefined,
            image: asMedia(p.image)?.sizes?.card?.url ?? asMedia(p.image)?.url ?? undefined,
          })),
        })}
      />
      <PatternDefs />
      <div className="arched" style={{ '--arch': archClip(theme.arch) } as CSSProperties}>
        <section className="band g-city-hero">
          <PatternFill id={theme.pattern} />
          <div className="wrap city-hero">
            <Crumbs items={[{ href: localePath(locale, '/cities'), label: T('المدن', 'Cities') }, { label: <Loc v={city.name} locale={locale} /> }]} />
            <Photo media={city.coverImage} shot={text(city.coverShotNote, locale) ?? ''} size="hero" priority />
            <div className="chips">
              <Chip kind="city">
                <Loc v={city.name} locale={locale} />
              </Chip>
              {text(city.tag, locale) && (
                <Chip kind="cat">
                  <Loc v={city.tag} locale={locale} />
                </Chip>
              )}
            </div>
            <h1>
              <Loc v={city.name} locale={locale} />
            </h1>
            <p style={{ fontSize: 18 }}>
              <Loc v={city.lede} locale={locale} />
            </p>
          </div>
        </section>

        <nav className="sticky-bar" aria-label={T('أقسام المدينة', 'City sections')}>
          <div className="wrap pills scroll-x" style={{ display: 'flex' }}>
            {tabs.map(([id, label]) => (
              <a key={id} className="pill" href={`#${id}`} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
                {label}
              </a>
            ))}
          </div>
        </nav>

        <section className="s" id="status">
          <div className="wrap">
            <SectionHead
              title={T('حال البلد اليوم', 'Status today')}
              lede={T(`يحدّثها مراسلنا في ${name} أسبوعياً.`, `Updated weekly by our ${name} correspondent.`)}
            />
            <StatusBoard cityName={name} items={items} locale={locale} maxAgeDays={settings.staleness?.statusDays ?? 7} />
          </div>
        </section>

        <section className="s" id="arch">
          <div className="wrap split">
            <div className="arch-box lift">
              <PatternFill id={theme.pattern} opacity={0.9} />
            </div>
            <div className="stack" style={{ gap: 12 }}>
              <span className="kicker">{T(`عمارة ${name} · من تاريخها`, `${name}’s architecture`)}</span>
              <h2>{theme.style[locale]}</h2>
              <p style={{ fontSize: 18 }}>{theme.note[locale]}</p>
              <p className="cap">{T('نقوش هذه الصفحة وشكل أقواس صورها مأخوذة من هذا الطراز.', 'This page’s pattern and the arch of its photo frames come from this style.')}</p>
            </div>
          </div>
        </section>

        <PatternBand id={theme.pattern} />

        <section className="s" id="sights">
          <div className="wrap">
            <SectionHead title={T('المعالم', 'Sights')} />
            {places.length ? (
              <div className="grid g3">
                {places.map((p) => (
                  <Card key={p.id} title={<Loc v={p.title} locale={locale} />} media={<Photo media={p.image} shot={text(p.description, locale) ?? ''} />}>
                    <p>
                      <Loc v={p.description} locale={locale} />
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="empty">{T('لم نضف أماكن لهذه المدينة بعد.', 'No places added for this city yet.')}</p>
            )}
          </div>
        </section>

        <section className="band g-city-hero" id="secrets">
          <PatternFill id={theme.pattern} opacity={0.1} />
          {locale === 'ar' ? (
            <div className="wrap stack pad-band" style={{ gap: 14 }}>
              <span className="kicker">من أهل {name}</span>
              <h2>أسرار ونهفات وأمثال</h2>
              <p>يرويها أهل المدينة أنفسهم، بأسمائهم. نهفات يحكيها الناس عن أنفسهم، بلا تنميط ولا إساءة لأحد.</p>
              <Lore items={lore} cityName={name} />
            </div>
          ) : (
            <div className="wrap stack pad-band" style={{ gap: 14 }}>
              <span className="kicker">From the people of {name}</span>
              <h2>Secrets, jokes and proverbs</h2>
              <p>
                Told and signed by people of the city, in Arabic only.{' '}
                <Link href={`/cities/${slug}#secrets`} hrefLang="ar" style={{ color: 'var(--band-fg)' }}>
                  Read them on the Arabic page
                </Link>
                .
              </p>
            </div>
          )}
        </section>

        <section className="s" id="food">
          <div className="wrap">
            <SectionHead
              title={T('مطاعم وكافيهات', 'Restaurants and cafes')}
              lede={T(`يزورها مراسلنا في ${name} ويكتب عنها بنفسه.`, `Visited and written up by our ${name} correspondent.`)}
            />
            <p style={{ fontSize: 17, marginBottom: 8 }}>
              <b style={{ color: 'var(--accent-text)' }}>{T('ماذا تأكل هنا: ', 'What to eat here: ')}</b>
              <Loc v={city.eat} locale={locale} />
            </p>
            <Filterable
              label={T('نوع المكان', 'Kind of place')}
              all={T('الكل', 'All')}
              options={(['restaurant', 'cafe', 'sweets'] as const).map((k) => ({ value: k, label: KIND[k][locale] }))}
              className="grid g3"
              items={eating.map((v) => ({ key: String(v.id), tags: [v.kind], node: <VenueCard v={v} locale={locale} /> }))}
              empty={
                <div className="slot">
                  <b>{T(`لم ننشر مطاعم ${name} بعد.`, `No ${name} restaurants published yet.`)}</b>
                  <span>{T('يضيفها مراسل المدينة بعد زيارتها، مع صورة من المكان نفسه.', 'Our correspondent adds them after a visit, with a photo from the place itself.')}</span>
                </div>
              }
            />
          </div>
        </section>

        <section className="s" id="parks">
          <div className="wrap">
            <SectionHead title={T('الحدائق والمنتزهات', 'Parks and gardens')} lede={T('أماكن للعائلة والجلسات والمشي داخل المدينة وحولها.', 'For families, picnics and walks in and around the city.')} />
            {parks.length ? (
              <div className="grid g3">
                {parks.map((v) => (
                  <VenueCard key={v.id} v={v} locale={locale} />
                ))}
              </div>
            ) : (
              <div className="slot">
                <b>{T(`لم ننشر حدائق ${name} بعد.`, `No ${name} parks published yet.`)}</b>
                <span>{T('يضيفها مراسل المدينة بعد زيارتها.', 'Our correspondent adds them after a visit.')}</span>
              </div>
            )}
          </div>
        </section>

        <PatternBand id={theme.pattern} />

        <section className="s" id="gallery">
          <div className="wrap">
            <SectionHead
              title={T(`معرض صور ${name}`, `${name} in photos`)}
              lede={T('صور من المكان نفسه، بتاريخها واسم مصوّرها.', 'Photos from the place itself, dated and credited.')}
            />
            {gallery.length ? (
              <Gallery photos={gallery} close={T('إغلاق', 'Close')} />
            ) : (
              <div className="slot">
                <b>{T('المعرض بانتظار أول صور المراسل.', 'The gallery is waiting for our correspondent’s first photos.')}</b>
                <span>
                  {T('مشي معنا: فيديو من منظور العين في حارات المدينة', 'Walk with us: an eye-level walk through the city')}
                  <SoonTag locale={locale} />
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="s" id="stay">
          <div className="wrap">
            <SectionHead
              title={T(`فنادق ${name}`, `Hotels in ${name}`)}
              lede={T('المدرجة في أهلين تُحجز منه مباشرة، وغير المدرجة نذكرها للمعلومة فقط بلا رابط.', 'Hotels on Ahleen can be booked there; others are listed for information only, without a link.')}
            />
            <Stays stays={stays} settings={settings} cityName={name} locale={locale} />
          </div>
        </section>
      </div>
    </Page>
  )
}
