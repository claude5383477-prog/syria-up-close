import { mergeByName } from '@/lib/venueClass'
import type { Metadata } from 'next'
import { SyrianFill } from '@/components/Patterns'
import Link from 'next/link'
import { TabsRow } from '@/components/client/TabsRow'
import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/seo'
import { ruralMeta } from '@/lib/seoText'
import { Page } from '@/components/Header'
import { ArabicOnly } from '@/components/ArabicOnly'
import { Crumbs, HowWeCheck, JsonLd, Photo, RelatedLinks, SourceList, Stays, text } from '@/components/content'
import { formatDate } from '@/components/Stamp'
import { Gallery } from '@/components/client/Gallery'
import { LiveMap, type MapKind, type MapPoint } from '@/components/client/LiveMap'
import { GUIDE, type GuideVenue } from '@/content/guide'
import { staticPhoto } from '@/content/photos'
import { asDoc, asMedia, getCityPhotos, getDayTrips, getLatestReports, getPlaces, getSettings, getStays, getTrip, getVenues, type CityDoc, type DayTripDoc, type TripSpot } from '@/data/queries'
import { citations, faqLd, siteBase, touristDestinationLd } from '@/lib/jsonld'
import { CITY_COORDS } from '@/lib/geo'
import { isLocale } from '@/lib/i18n'
import { mapLink, placePoint, type LatLng } from '@/lib/maplinks'
import { pointOf as recordPoint } from '@/lib/geocode'
import { localePath } from '@/lib/routing'
import { parseTripKey, sourceLines, tripAnswers, tripPath, tripPhotoKeys } from '@/lib/rural'

// A countryside page: one weekend trip (owner decision 2026-10-26). Arabic only, like all of /inside.
export const revalidate = 3600

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const trips = await getDayTrips()
  return trips.map((t) => ({ slug: tripPath(t).slice('/inside/'.length) }))
}

async function load(slug: string) {
  const key = parseTripKey(slug)
  return key ? getTrip(key) : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const trip = isLocale(locale) ? await load(slug) : null
  if (!trip || !isLocale(locale)) return {}
  const from = asDoc(trip.fromCity)
  const place: CityDoc | null = asDoc(trip.place) ?? null
  // The sections the page shows, from the same (request-cached) queries as the page.
  const [places, venues, stays] = await Promise.all([
    place ? getPlaces(place.id) : Promise.resolve([]),
    place ? getVenues(place.id) : Promise.resolve([]),
    place ? getStays(place.id) : Promise.resolve([]),
  ])
  const guide = place ? GUIDE[place.slug] : undefined
  const spots = trip.spots ?? []
  const count = (kind: TripSpot['kind']) => spots.filter((s) => s.kind === kind).length
  const dbFood = venues.filter((v) => v.kind !== 'park').length
  const { title, description } = ruralMeta({
    name: trip.title,
    fromName: from ? text(from.name, 'ar') : null,
    distance: trip.distanceNote,
    description: trip.description,
    food: count('food') + (dbFood || (guide?.venues.filter((v) => v.kind !== 'dish').length ?? 0)),
    nature: count('nature'),
    ruins: count('ruins') + places.length,
    picnic: count('picnic') + (guide?.parks.length ?? 0),
    stays: count('stay') + stays.length,
  })
  return pageMetadata({
    locale,
    path: tripPath(trip),
    title,
    description,
    arabicOnly: true,
    ownImage: true,
  })
}

const SPOT_KIND: Record<TripSpot['kind'], MapKind> = { stay: 'stay', food: 'restaurant', nature: 'nature', ruins: 'ruins', picnic: 'picnic' }
const KIND_AR: Record<MapKind, { one: string; many: string }> = {
  stay: { one: 'إقامة', many: 'إقامات' },
  restaurant: { one: 'مطعم', many: 'مطاعم' },
  cafe: { one: 'كافيه', many: 'كافيهات' },
  sweets: { one: 'حلويات', many: 'حلويات' },
  sight: { one: 'معلم', many: 'معالم' },
  park: { one: 'حديقة', many: 'حدائق' },
  nature: { one: 'طبيعة', many: 'ينابيع وطبيعة' },
  ruins: { one: 'آثار', many: 'آثار' },
  picnic: { one: 'سيران', many: 'سيران وتخييم' },
}

type Card = { id: string; kind: string; name: string; note?: string | null; href: string; media?: TripSpot['image']; fallback?: string; point?: LatLng | null }

function SpotCard({ c }: { c: Card }) {
  return (
    <div className="venue lift">
      {(c.media || staticPhoto(c.fallback)) && <Photo media={c.media} shot={c.name} fallback={c.fallback} />}
      <span className="body">
        <span className="meta">{c.kind}</span>
        <h3>{c.name}</h3>
        {c.note && <p>{c.note}</p>}
        <a className="where" href={c.href} target="_blank" rel="noopener">
          خذني لهون ↗
        </a>
      </span>
    </div>
  )
}

export default async function TripPage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const trip: DayTripDoc | null = await load(slug)
  if (!trip) notFound()

  const from = asDoc(trip.fromCity)
  const place: CityDoc | null = asDoc(trip.place) ?? null
  const fromName = from ? (text(from.name, 'ar') ?? from.slug) : ''
  const region = from ? `ريف ${fromName}` : 'جوّا سوريا'
  const [settings, places, venues, stays, photos, allTrips, reports] = await Promise.all([
    getSettings(),
    place ? getPlaces(place.id) : Promise.resolve([]),
    place ? getVenues(place.id) : Promise.resolve([]),
    place ? getStays(place.id) : Promise.resolve([]),
    place ? getCityPhotos(place.id) : Promise.resolve([]),
    getDayTrips(),
    getLatestReports(100),
  ])
  // Internal links (SEO day 4): the other places around the same city, and this place's season reports.
  const siblings = from ? allTrips.filter((t) => t.id !== trip.id && asDoc(t.fromCity)?.id === from.id) : []
  const placeReports = place ? reports.filter((r) => asDoc(r.city)?.id === place.id) : []
  const guide = place ? GUIDE[place.slug] : undefined
  const spots = trip.spots ?? []
  const pointOf = (lat?: number | null, lng?: number | null): LatLng | null => (lat != null && lng != null ? [lat, lng] : null)
  const center: LatLng = pointOf(trip.lat, trip.lng) ?? (place && CITY_COORDS[place.slug]) ?? (from && CITY_COORDS[from.slug]) ?? [33.5115, 36.3065]
  const href = (point: LatLng | null, name: string) => mapLink(point, name, trip.title)
  const placeSlug = place?.slug ?? ''

  const spotCards = (kind: TripSpot['kind']): Card[] =>
    spots
      .filter((s) => s.kind === kind)
      .map((s, i) => ({ id: s.id ?? `${kind}${i}`, kind: KIND_AR[SPOT_KIND[kind]].one, name: s.name, note: s.note, media: s.image, fallback: `spot-${trip.slug}-${s.name}`, href: href(pointOf(s.lat, s.lng), s.name) }))
  // A resort's own record (its venues and guide list) feeds the food section.
  const guideVenue = (v: GuideVenue, i: number): Card => ({ id: `g${i}`, kind: KIND_AR[v.kind === 'cafe' ? 'cafe' : v.kind === 'sweets' ? 'sweets' : 'restaurant'].one, name: v.name.ar, note: v.note.ar, fallback: v.photo, point: placePoint(placeSlug, v.name.ar), href: href(placePoint(placeSlug, v.name.ar), v.name.ar) })
  const dbFood: Card[] = venues
    .filter((v) => v.kind !== 'park')
    .map((v) => {
      const n = text(v.name, 'ar') ?? ''
      const pt = recordPoint(v, placeSlug, n)
      return { id: `v${v.id}`, kind: KIND_AR[v.kind === 'cafe' ? 'cafe' : v.kind === 'sweets' ? 'sweets' : 'restaurant'].one, name: n, note: text(v.note, 'ar'), media: v.image, point: pt, href: href(pt, n) }
    })
  const placeFood = mergeByName(dbFood, guide?.venues.filter((v) => v.kind !== 'dish').map(guideVenue) ?? [], (v) => v.name)
  const placeParks = guide?.parks.map(guideVenue) ?? []
  const placeSights: Card[] = places.map((p) => {
    const n = text(p.title, 'ar') ?? ''
    const pt = recordPoint(p, placeSlug, n)
    return { id: `p${p.id}`, kind: 'معلم', name: n, note: text(p.description, 'ar'), media: p.image, point: pt, href: href(pt, n) }
  })
  const food = [...spotCards('food'), ...placeFood]
  const parks = [...spotCards('picnic'), ...placeParks]
  const nature = spotCards('nature')
  const ruins = [...spotCards('ruins'), ...placeSights]
  const stayCards = spotCards('stay')

  const points: MapPoint[] = [
    ...spots.map((s, i) => ({ id: `s${i}`, kind: SPOT_KIND[s.kind], name: s.name, note: s.note ?? undefined, point: pointOf(s.lat, s.lng), href: href(pointOf(s.lat, s.lng), s.name) })),
    ...([
      ['restaurant', placeFood],
      ['park', placeParks],
      ['sight', placeSights],
    ] as const).flatMap(([kind, cards]) => cards.map((c): MapPoint => ({ id: c.id, kind, name: c.name, note: c.note ?? undefined, point: c.point ?? placePoint(placeSlug, c.name), href: c.href }))),
    // The resort's hotels too, each with its own pin when it has one.
    ...stays.map((st): MapPoint => {
      const n = text(st.title, 'ar') ?? ''
      const pt = recordPoint(st, placeSlug, n)
      return { id: `h${st.id}`, kind: 'stay', name: n, point: pt, href: href(pt, n) }
    }),
  ]
  const hotels = stays.filter((s) => s.ahleenUrl && !/\/cities\//.test(s.ahleenUrl)).length
  const answers = tripAnswers({ name: trip.title, region, distance: trip.distanceNote, spots: [...spots, ...placeFood.map((c) => ({ kind: 'food' as const, name: c.name }))], hotels })
  const gallery = photos.flatMap((ph) => {
    const m = asMedia(ph.photo)
    const src = m?.sizes?.card?.url ?? m?.url
    if (!m || !src) return []
    const caption = text(ph.caption, 'ar') ?? trip.title
    const full = m.sizes?.hero?.url ?? m.url ?? src
    return [{ id: ph.id, src, ...(full !== src ? { full } : {}), alt: caption, meta: [ph.credit ?? m.credit, ph.shotDate ? formatDate(new Date(ph.shotDate), 'ar') : null].filter(Boolean).join(' · ') }]
  })
  // A resort's own record has a guide gallery; other trips use their Commons picks (scripts/photos-fill.mjs).
  const tripKeys = tripPhotoKeys(trip).filter((k) => staticPhoto(k))
  const galleryKeys = guide?.gallery.length ? guide.gallery : tripKeys
  const guideGallery = galleryKeys.flatMap((key, i) => {
    const sp = staticPhoto(key)
    return sp ? [{ id: -1 - i, src: sp.src, alt: `صورة من ${trip.title}`, meta: sp.credit }] : []
  })
  const pics = gallery.length ? gallery : guideGallery
  const sources = sourceLines(trip.sources)
  const checked = trip.checkedAt ?? trip.updatedAt
  const fromPath = from ? localePath('ar', `/cities/${from.slug}`) : '/inside'
  // Owner decision 2026-10-27 ("leave nothing empty"): a section with no real place is left out, with
  // its tab, instead of showing dashed slots. Where to stay is always there (Ahleen's page for the area).
  const filled: Record<string, boolean> = { food: food.length > 0, nature: nature.length > 0, ruins: ruins.length > 0, picnic: parks.length > 0, gallery: pics.length > 0 }
  const tabs = (
    [
      ['map', 'الخريطة'],
      ['stay', 'وين تنام'],
      ['food', 'وين تاكل'],
      ['nature', 'ينابيع وطبيعة'],
      ['ruins', 'آثار'],
      ['picnic', 'سيران وتخييم'],
      ['gallery', 'الصور'],
      ['faq', 'أسئلة'],
    ] as [string, string][]
  ).filter(([id]) => filled[id] !== false)

  const section = (id: string, kicker: string, title: string, lede: string, cards: Card[], alt = false) =>
    cards.length === 0 ? null : (
      <section className={alt ? 'sec alt' : 'sec'} id={id} key={id}>
        <div className="wrap" style={{ paddingBlock: 16 }}>
          <div className="sec-head" style={{ marginBottom: 20 }}>
            <div>
              <span className="eyebrow">{kicker}</span>
              <h2>{title}</h2>
              <p>{lede}</p>
            </div>
          </div>
          <div className="venue-grid">
            {cards.map((c) => (
              <SpotCard key={c.id} c={c} />
            ))}
          </div>
        </div>
      </section>
    )

  return (
    <Page locale={locale} path={tripPath(trip)}>
      <JsonLd
        data={touristDestinationLd({
          base: siteBase(),
          locale: 'ar',
          path: tripPath(trip),
          name: trip.title,
          description: trip.description ?? undefined,
          geo: pointOf(trip.lat, trip.lng) ?? undefined,
          dateModified: checked ?? undefined,
          citation: citations(sources),
          attractions: spots
            .filter((s) => s.kind === 'nature' || s.kind === 'ruins')
            .map((s) => ({ name: s.name, description: s.note ?? undefined, geo: pointOf(s.lat, s.lng) ?? undefined })),
        })}
      />
      {answers.faq.length > 0 && <JsonLd data={faqLd(answers.faq)} />}
      <ArabicOnly locale={locale}>
        <section className="dark city-top trip-top">
          <SyrianFill id="khatam" opacity={0.08} />
          <span className="veil" aria-hidden="true" />
          <div className="wrap">
            <div className="intro">
              <Crumbs items={[{ href: '/inside', label: 'جوّا سوريا' }, ...(from ? [{ href: fromPath, label: region }] : []), { label: trip.title }]} />
              {trip.tag && <span className="tagline rise">{trip.tag} · {region}</span>}
              <h1 className="rise2">{trip.title}</h1>
              {trip.description && (
                <p className="lede rise3" style={{ fontSize: 21 }}>
                  {trip.description}
                </p>
              )}
              <div className="trip-facts">
                {trip.distanceNote && <span>{trip.distanceNote}</span>}
                {from && <span>من {fromName}</span>}
              </div>
              {checked && (
                <span className="by">
                  آخر تحديث: <time dateTime={checked}>{formatDate(new Date(checked), 'ar')}</time> · {sources.length ? 'من مصادر منشورة، والمراسل بيأكدها بزيارته' : 'بانتظار زيارة المراسل'} · <HowWeCheck locale="ar" />
                </span>
              )}
            </div>
            <div className="stage trip-pics">
              <div className="p1">
                <Photo media={place?.coverImage} shot={`${trip.title} من فوق`} size="hero" priority layer="rural-main" fallback={guide?.gallery[0] ?? tripKeys[0]} />
              </div>
              <div className="p2">
                <Photo shot="نبع أو بستان" layer="rural-side" fallback={guide?.gallery[1] ?? tripKeys[1]} />
              </div>
              <div className="p3">
                <Photo shot="بيوت البلدة" layer="rural-side" fallback={guide?.gallery[2] ?? tripKeys[2]} />
              </div>
            </div>
          </div>
        </section>

        <nav className="sticky-bar city-tabs" aria-label="أقسام المكان">
          <TabsRow prev={'الأقسام السابقة'} next={'أقسام أخرى'}>
            <span className="jump" aria-hidden="true">
              انتقل إلى:
            </span>
            {tabs.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </TabsRow>
        </nav>

        <section className="sec short-sec" aria-labelledby="short-h">
          <div className="wrap">
            <div className="short">
              <div>
                <span className="eyebrow">باختصار</span>
                <h2 id="short-h">{trip.title} في سطرين</h2>
              </div>
              <dl>
                {answers.facts.map((f) => (
                  <div key={f.k}>
                    <dt>{f.k}</dt>
                    <dd>{f.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="sec" id="map" style={{ paddingTop: 40, paddingBottom: 32 }}>
          <div className="wrap">
            <LiveMap
              center={center}
              points={points}
              locale="ar"
              cityName={trip.title}
              text={{
                kicker: `خريطة ${trip.title} الحيّة · GPS`,
                title: 'كل شي حواليك',
                all: 'الكل',
                kinds: KIND_AR,
                locate: 'حدد موقعي',
                locating: 'عم نحدد موقعك…',
                located: 'موقعك ظاهر على الخريطة ويتحدّث وإنت عم تمشي.',
                stop: 'أوقف تتبّع موقعي',
                denied: 'ما قدرنا نوصل لموقعك. اسمح للموقع بالوصول من إعدادات المتصفح وجرّب مرة ثانية.',
                far: `إنت بعيد عن ${trip.title}، فالمسافات محسوبة من مكانك الحالي.`,
                go: 'خذني لهون ↗',
                nearest: 'الأقرب لك أولاً',
                count: '{n} مكان',
                away: 'على بعد {d}',
                noPin: 'بلا إحداثيات بعد · افتح على خرائط Google',
                note: 'الخريطة: OpenStreetMap. الأماكن اللي ما إلها إحداثيات بعد، رابطها بحث بالاسم. موقعك يبقى على جهازك ولا نحفظه.',
                region: `خريطة ${trip.title}`,
                list: 'عرض كقائمة ({n})',
                hideList: 'خبّي القائمة',
              }}
            />
          </div>
        </section>

        <section className="sec alt" id="stay">
          <div className="wrap" style={{ paddingBlock: 16 }}>
            <div className="sec-head" style={{ marginBottom: 20 }}>
              <div>
                <span className="eyebrow">فنادق وبيوت ريفية</span>
                <h2>وين تنام</h2>
              </div>
            </div>
            {stayCards.length > 0 && (
              <div className="venue-grid" style={{ marginBottom: 24 }}>
                {stayCards.map((c) => (
                  <SpotCard key={c.id} c={c} />
                ))}
              </div>
            )}
            <Stays stays={stays} settings={settings} cityName={trip.title} locale="ar" fallback={guide?.gallery[0]} citySlug={place?.slug ?? from?.slug} />
          </div>
        </section>

        {section('food', 'مطاعم وكافيهات', 'وين تاكل', 'مطاعم المشاوي والنبع والكافيهات، بلا أسعار.', food)}
        {section('nature', 'أنهار وينابيع وجبال', 'ينابيع وطبيعة', 'الينابيع والأنهار والقمم القريبة.', nature, true)}
        {section('ruins', 'آثار وأديرة', 'آثار', 'أديرة وقلاع ومعابد وبقايا أبنية قديمة.', ruins)}
        {section('picnic', 'سيران وتخييم', 'سيران وتخييم', 'أماكن قعدة العيلة. أماكن التخييم بعد ما يزورها المراسل.', parks, true)}

        {pics.length > 0 && (
          <section className="dark gallery-band" id="gallery">
            <SyrianFill id="mash" opacity={0.1} />
            <div className="wrap">
              <div className="sec-head">
                <div>
                  <span className="eyebrow">صور من المكان نفسه، بتاريخها واسم مصوّرها</span>
                  <h2>صور {trip.title}</h2>
                </div>
                <Link className="ghost-pill" href="/correspondent">
                  صوّر المكان وأرسله
                </Link>
              </div>
              <Gallery photos={pics} close="إغلاق" />
            </div>
          </section>
        )}

        <RelatedLinks
          id="around"
          kicker={from ? region : undefined}
          title={from ? `أماكن أخرى في ريف ${fromName}` : 'أماكن أخرى جوّا سوريا'}
          links={[
            ...(from ? [{ href: fromPath, label: `دليل مدينة ${fromName}` }] : []),
            ...siblings.map((t) => ({ href: tripPath(t), label: t.title })),
            ...placeReports.map((r) => ({ href: `/seasons/${r.slug}`, label: `تقرير موسم: ${r.title}` })),
          ]}
        />

        <section className="sec alt" id="faq">
          <div className="wrap" style={{ paddingBlock: 16 }}>
            <span className="eyebrow">أسئلة بيسألها الناس</span>
            <h2 className="h-xl" style={{ marginBottom: 20 }}>
              أسئلة عن {trip.title}
            </h2>
            <div className="faq-list">
              {answers.faq.map((f) => (
                <details key={f.q} className="faq">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
            <div className="cap sources">
              <b>المصادر:</b>{' '}
              {sources.length ? <SourceList lines={sources} /> : 'بانتظار المراسل.'} {from && <Link href={fromPath}>صفحة {fromName} ←</Link>}
            </div>
          </div>
        </section>
      </ArabicOnly>
    </Page>
  )
}
