import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Crumbs, JsonLd, Loc, Photo, StatusBoard, Stays, text } from '@/components/content'
import { CityPicker } from '@/components/client/CityPicker'
import { siteBase, touristDestinationLd } from '@/lib/jsonld'
import { PhotoPlaceholder, SoonTag } from '@/components/ui'
import type { CSSProperties } from 'react'
import { PatternBand, PatternDefs, PatternFill } from '@/components/Patterns'
import { Filterable } from '@/components/client/Filterable'
import { Gallery } from '@/components/client/Gallery'
import { Lore } from '@/components/client/Lore'
import { archClip, cityTheme } from '@/lib/cityTheme'
import { isLocale, type Locale } from '@/lib/i18n'
import { isTranslated } from '@/lib/localized'
import { asMedia, type L, getCities, getCity, getCityLore, getCityPhotos, getPlaces, getSettings, getStatusItems, getStays, getVenues, type VenueDoc } from '@/data/queries'
import { formatDate } from '@/components/Stamp'
import { GUIDE, GUIDE_CHECKED, type GuideKind, type GuideVenue } from '@/content/guide'
import { staticPhoto } from '@/content/photos'
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
  dish: { ar: 'طبق المدينة', en: 'Local dish' },
  park: { ar: 'حديقة', en: 'Park' },
} as const

/** A venue card from the CMS, or from the starter guide (content/guide) while the CMS has none. */
type VenueCardData = { id: string; kind: GuideKind; name: L; hood?: L; note?: L; image?: VenueDoc['image']; fallback?: string }

const fromDb = (v: VenueDoc): VenueCardData => ({ id: String(v.id), kind: v.kind, name: v.name, hood: v.neighbourhood, note: v.note, image: v.image })
const fromGuide = (v: GuideVenue, i: number): VenueCardData => ({ id: `g${i}`, kind: v.kind, name: v.name, hood: v.hood, note: v.note, fallback: v.photo })

function VenueCard({ v, locale }: { v: VenueCardData; locale: Locale }) {
  return (
    <div className={v.kind === 'park' ? 'park lift' : 'venue lift'}>
      {(v.image || staticPhoto(v.fallback)) && <Photo media={v.image} shot={text(v.name, locale) ?? ''} fallback={v.fallback} />}
      <span className="body">
        <span className="meta">{KIND[v.kind][locale]}</span>
        <h3>
          <Loc v={v.name} locale={locale} />
        </h3>
        {(text(v.hood, locale) || text(v.note, locale)) && (
          <p>
            <Loc v={v.hood} locale={locale} />
            {text(v.hood, locale) && text(v.note, locale) && ' · '}
            <Loc v={v.note} locale={locale} />
          </p>
        )}
      </span>
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
  const guide = GUIDE[slug]
  const dbEating = venues.filter((v) => v.kind !== 'park').map(fromDb)
  const dbParks = venues.filter((v) => v.kind === 'park').map(fromDb)
  const eating = dbEating.length ? dbEating : (guide?.venues.map(fromGuide) ?? [])
  const parks = dbParks.length ? dbParks : (guide?.parks.map(fromGuide) ?? [])
  const loreItems = lore.length ? lore : (guide?.lore.map((g, i) => ({ id: -1 - i, kind: g.kind, text: g.text, meaning: g.meaning ?? null, tellerName: g.teller })) ?? [])
  const guideGallery = (guide?.gallery ?? []).flatMap((key, i) => {
    const sp = staticPhoto(key)
    return sp ? [{ id: -1 - i, src: sp.src, full: sp.src, alt: T(`صورة من ${name}`, `A photo of ${name}`), caption: T(`صورة من ${name}`, `A photo of ${name}`), meta: sp.credit }] : []
  })
  const g0 = guide?.gallery[0]
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

  const all = await getCities()
  const pad = (n: number) => String(n).padStart(2, '0')
  const join = '/correspondent'

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
        <section className="dark city-top">
          <PatternFill id={theme.pattern} opacity={0.16} />
          <div className="wrap">
            <div className="intro">
              <Crumbs items={[{ href: localePath(locale, '/cities'), label: T('المدن', 'Cities') }, { label: <Loc v={city.name} locale={locale} /> }]} />
              <CityPicker
                label={T('اختر المدينة', 'Choose a city')}
                current={slug}
                options={all.map((c) => ({ slug: c.slug, name: text(c.name, locale) ?? c.slug, href: localePath(locale, `/cities/${c.slug}`) }))}
              />
              {text(city.tag, locale) && (
                <span className="tagline rise">
                  <Loc v={city.tag} locale={locale} />
                </span>
              )}
              <h1 className="rise2">
                <Loc v={city.name} locale={locale} />
              </h1>
              <p className="lede rise3" style={{ fontSize: 21 }}>
                <Loc v={city.lede} locale={locale} />
              </p>
            </div>
            <div className="stage">
              <div className="layers">
                <div className="l3">
                  <Photo media={places[1]?.image} shot={(places[1] && text(places[1].title, locale)) || T('صورة ٣', 'Photo 3')} fallback={guide?.gallery[2]} />
                </div>
                <div className="l2">
                  <Photo media={places[0]?.image} shot={(places[0] && text(places[0].title, locale)) || T('صورة ٢', 'Photo 2')} fallback={guide?.gallery[1]} />
                </div>
                <div className="l1 arch">
                  <Photo media={city.coverImage} shot={text(city.coverShotNote, locale) ?? T('صورة الغلاف', 'Cover photo')} size="hero" priority fallback={g0} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <nav className="sticky-bar city-tabs" aria-label={T('أقسام المدينة', 'City sections')}>
          <div className="wrap scroll-x">
            {tabs.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </div>
        </nav>

        <section className="sec" id="status" style={{ paddingTop: 64, paddingBottom: 32 }}>
          <div className="wrap">
            <div className="sec-head" style={{ marginBottom: 24 }}>
              <div>
                <h2>{T('حال البلد اليوم', 'Status today')}</h2>
                <p>{T(`يحدّثها مراسلنا في ${name} أسبوعياً.`, `Updated weekly by our ${name} correspondent.`)}</p>
              </div>
              <span className="more" style={{ color: 'var(--ink2)', fontWeight: 400, fontSize: 14 }}>
                {T('كل بند يحمل اسم من تحقق منه وتاريخه', 'Every line carries who checked it and when')}
              </span>
            </div>
            <StatusBoard cityName={name} items={items} locale={locale} maxAgeDays={settings.staleness?.statusDays ?? 7} />
          </div>
        </section>

        <section className="sec" id="arch">
          <div className="wrap arch-row">
            <div className="arch-box lift">
              <PatternFill id={theme.pattern} opacity={0.9} />
            </div>
            <div className="txt">
              <span className="eyebrow">{T(`عمارة ${name} · من تاريخها`, `${name}’s architecture`)}</span>
              <h2 className="h-xl">{theme.style[locale]}</h2>
              <p className="copy" style={{ color: 'var(--ink)' }}>{theme.note[locale]}</p>
              <p className="cap">{T('نقوش هذه الصفحة وشكل أقواس صورها مأخوذة من هذا الطراز.', 'This page’s pattern and the arch of its photo frames come from this style.')}</p>
            </div>
          </div>
        </section>

        <PatternBand id={theme.pattern} />

        <section className="sec" id="sights">
          <div className="wrap">
            <div className="sec-head" style={{ marginBottom: 24 }}>
              <h2>{T('المعالم', 'Sights')}</h2>
              {places.length > 0 && (
                <span className="more" style={{ color: 'var(--ink2)', fontWeight: 400, fontSize: 15 }}>
                  {T(`${places.length} معلماً`, `${places.length} places`)}
                </span>
              )}
            </div>
            {places.length ? (
              <div className="cards c4">
                {places.map((p, i) => (
                  <div className="pcard lift" key={p.id}>
                    {asMedia(p.image) || staticPhoto(`place-${slug}-${text(p.title, 'ar')}`) ? (
                      <span className="media arch">
                        <Photo media={p.image} shot={text(p.title, locale) ?? ''} fallback={`place-${slug}-${text(p.title, 'ar')}`} />
                        <span className="num">{pad(i + 1)}</span>
                      </span>
                    ) : (
                      <span className="trip-num">{pad(i + 1)}</span>
                    )}
                    <span className="body">
                      <h3 className="title">
                        <Loc v={p.title} locale={locale} />
                      </h3>
                      <p style={{ fontSize: 15 }}>
                        <Loc v={p.description} locale={locale} />
                      </p>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">{T('لم نضف أماكن لهذه المدينة بعد.', 'No places added for this city yet.')}</p>
            )}
          </div>
        </section>

        <PatternBand id={theme.pattern} />

        <section className="dark lore-band" id="secrets">
          <PatternFill id={theme.pattern} opacity={0.1} />
          {locale === 'ar' ? (
            <div className="wrap">
              <span className="eyebrow">من أهل {name}</span>
              <h2 className="h-xl">أسرار ونهفات وأمثال</h2>
              <p className="copy" style={{ fontSize: 16, maxWidth: 720 }}>
                يرويها أهل المدينة أنفسهم، بأسمائهم. نهفات يحكيها الناس عن أنفسهم، بلا تنميط ولا إساءة لأحد.
              </p>
              <Lore items={loreItems} cityName={name} />
              <Link className="btn-pill" href={join} style={{ marginTop: 28 }}>
                احكيلنا سرّ أو نهفة أو مثل من {name} ←
              </Link>
            </div>
          ) : (
            <div className="wrap">
              <span className="eyebrow">From the people of {name}</span>
              <h2 className="h-xl">Secrets, jokes and proverbs</h2>
              <p className="copy" style={{ fontSize: 16 }}>
                Told and signed by people of the city, in Arabic only.{' '}
                <Link href={`/cities/${slug}#secrets`} hrefLang="ar" style={{ color: 'var(--cream)' }}>
                  Read them on the Arabic page
                </Link>
                .
              </p>
            </div>
          )}
        </section>

        <section className="sec alt" id="food">
          <div className="wrap" style={{ paddingBlock: 16 }}>
            <div className="sec-head" style={{ marginBottom: 12 }}>
              <div>
                <h2>{T('مطاعم وكافيهات', 'Restaurants and cafes')}</h2>
                <p>{T(`يزورها مراسلنا في ${name} ويكتب عنها بنفسه.`, `Visited and written up by our ${name} correspondent.`)}</p>
              </div>
            </div>
            <Filterable
              label={T('نوع المكان', 'Kind of place')}
              all={T('الكل', 'All')}
              options={(['restaurant', 'cafe', 'sweets', 'dish'] as const).filter((k) => eating.some((v) => v.kind === k)).map((k) => ({ value: k, label: KIND[k][locale] }))}
              className="venue-grid"
              head={
                <p className="copy eat" style={{ fontSize: 17, color: 'var(--ink)' }}>
                  <b>{T('ماذا تأكل هنا: ', 'What to eat here: ')}</b>
                  <Loc v={city.eat} locale={locale} />
                  {!dbEating.length && (
                    <span className="guide-note">
                      {T(`قائمة أولية جُمعت في ${formatDate(new Date(GUIDE_CHECKED), 'ar')} من أدلة منشورة (ويكي فوياج وتريب أدفايزر) ومن خرائط Google. تحقّق من الدوام قبل الذهاب، ويحدّثها مراسل المدينة بعد زيارته.`, `A first list compiled on ${formatDate(new Date(GUIDE_CHECKED), 'en')} from published guides (Wikivoyage, TripAdvisor) and Google Maps. Check opening hours before you go; our correspondent updates it after visiting.`)}
                    </span>
                  )}
                </p>
              }
              items={eating.map((v) => ({ key: v.id, tags: [v.kind], node: <VenueCard v={v} locale={locale} /> }))}
              empty={
                <>
                  {(['restaurant', 'cafe', 'sweets'] as const).map((k, i) => (
                    <div key={k} className="venue slot-card">
                      <PhotoPlaceholder shot={T('صورة من المكان', 'Photo of the place')} />
                      <span className="body">
                        <span className="meta">{KIND[k][locale]}</span>
                        <h3>{i === 0 ? T(`لم ننشر مطاعم ${name} بعد.`, `No ${name} restaurants published yet.`) : T('بانتظار زيارة المراسل', 'Awaiting a visit')}</h3>
                        <span className="wait">{T('يضيفه مراسل المدينة بعد زيارته', 'Added by our correspondent after a visit')}</span>
                      </span>
                    </div>
                  ))}
                </>
              }
            />
          </div>
        </section>

        <section className="sec" id="parks" style={{ paddingBlock: 64 }}>
          <div className="wrap">
            <div className="sec-head" style={{ marginBottom: 24 }}>
              <div>
                <h2>{T('الحدائق والمنتزهات', 'Parks and gardens')}</h2>
                <p>{T('أماكن للعائلة والجلسات والمشي داخل المدينة وحولها.', 'For families, picnics and walks in and around the city.')}</p>
              </div>
            </div>
            <div className="park-grid">
              {parks.length
                ? parks.map((v) => <VenueCard key={v.id} v={v} locale={locale} />)
                : [T('حديقة عامة', 'Public garden'), T('منتزه عائلي', 'Family park'), T('مسار مشي', 'Walking trail')].map((k, i) => (
                    <div key={k} className="park slot-card">
                      <PhotoPlaceholder shot={T('صورة', 'Photo')} />
                      <span className="body">
                        <span className="meta">{k}</span>
                        <h3>{i === 0 ? T(`لم ننشر حدائق ${name} بعد.`, `No ${name} parks published yet.`) : T('بانتظار أول تحقق', 'Awaiting first check')}</h3>
                      </span>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        <PatternBand id={theme.pattern} />

        <section className="dark gallery-band" id="gallery">
          <div className="wrap">
            <div className="sec-head">
              <div>
                <span className="eyebrow">{T('صور من المكان نفسه، بتاريخها واسم مصوّرها', 'Photos from the place itself, dated and credited')}</span>
                <h2>{T(`معرض صور ${name}`, `${name} in photos`)}</h2>
              </div>
              <Link className="ghost-pill" href={join}>
                {T('صوّر مدينتك وأرسلها', 'Photograph your city')}
              </Link>
            </div>
            {gallery.length || guideGallery.length ? (
              <Gallery photos={gallery.length ? gallery : guideGallery} close={T('إغلاق', 'Close')} />
            ) : (
              <div className="gallery waiting" aria-hidden="true">
                {['wide tall', 'g1', 'g2', 'tall g3', 'wide g4', 'g5', 'g6', 'wide g7'].map((c, i) => (
                  <span key={i} className={c}>
                    {T(`صورة ${i + 1} من ${name}`, `Photo ${i + 1} of ${name}`)}
                  </span>
                ))}
              </div>
            )}
            <p className="copy" style={{ marginTop: 18, fontSize: 15 }}>
              {T('مشي معنا: فيديو من منظور العين في حارات المدينة', 'Walk with us: an eye-level walk through the city')}
              <SoonTag locale={locale} />
            </p>
          </div>
        </section>

        <section className="sec" id="stay" style={{ paddingBlock: 72 }}>
          <div className="wrap">
            <div className="sec-head" style={{ marginBottom: 10 }}>
              <h2>{T(`فنادق ${name}`, `Hotels in ${name}`)}</h2>
            </div>
            <p className="copy" style={{ fontSize: 16, marginBottom: 24 }}>
              {T('الفنادق المدرجة في أهلين تُحجز منه مباشرة. غير المدرجة نذكرها للمعلومة فقط، بلا رابط.', 'Hotels on Ahleen can be booked there directly. Others are listed for information only, without a link.')}
            </p>
            <Stays stays={stays} settings={settings} cityName={name} locale={locale} fallback={g0} />
          </div>
        </section>
      </div>
    </Page>
  )
}
