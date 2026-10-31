import type { Metadata } from 'next'
import { SyrianFill } from '@/components/Patterns'
import { pageMetadata } from '@/lib/seo'
import { describe, SITE_LINE } from '@/lib/seoText'
import { Page } from '@/components/Header'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArabicOnly } from '@/components/ArabicOnly'
import { Filterable } from '@/components/client/Filterable'
import { Photo, Stays, text } from '@/components/content'
import { staticPhoto } from '@/content/photos'
import { asDoc, getCity, getDayTrips, getMainCities, getSettings, getStays, type DayTripDoc } from '@/data/queries'
import { tripPath } from '@/lib/rural'
import { isLocale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const trips = (await getDayTrips()).length
  return pageMetadata({
    locale,
    path: '/inside',
    title: T('جوّا سوريا: مشاوير ومصايف قريبة من مدينتك', 'Inside Syria'),
    description: describe([
      'مشاوير قريبة من مدينتك، ومصايف وبيوت ريفية للعيلة',
      trips > 0 && `${trips} مشوار بريف المدن، لكل واحد صفحة فيها وين تنام وخريطة حيّة`,
      SITE_LINE.ar,
    ]),
    arabicOnly: true,
  })
}

/** "Inside Syria": Arabic only (SPEC §5.3). */
export default async function InsidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const [trips, bloudan, settings] = await Promise.all([getDayTrips(), getCity('bloudan'), getSettings()])
  const bloudanStays = bloudan ? await getStays(bloudan.id) : []

  // Group trips by the city they start from, keeping the editor's order.
  const groups = new Map<string, { from: string; name: string; items: DayTripDoc[] }>()
  for (const t of trips) {
    const city = asDoc(t.fromCity)
    const key = city?.slug ?? 'other'
    const cityName = city ? (text(city.name, 'ar') ?? key) : 'مشاوير'
    if (!groups.has(key)) groups.set(key, { from: city ? `من ${cityName}` : 'مشاوير', name: cityName, items: [] })
    groups.get(key)!.items.push(t)
  }

  const cities = await getMainCities()
  let n = 0
  const num = () => String(++n).padStart(2, '0')

  return (
    <Page locale={locale} path="/inside">
      <ArabicOnly locale={locale}>
        <section className="dark band2">
          <SyrianFill id="khatam" opacity={0.1} />
          <div className="wrap page-hero" style={{ paddingTop: 72, paddingBottom: 64 }}>
            <span className="eyebrow rise">للي عايشين بسوريا · عربي فقط</span>
            <h1 className="big rise2">جوّا سوريا</h1>
            <p className="lede rise3" style={{ fontSize: 21, maxWidth: 680 }}>
              وين نطلع هالويكند؟ مشاوير يوم، مصايف، وبيوت ريفية، مرتّبة حسب المدينة اللي بتطلع منها.
            </p>
          </div>
        </section>

        <section className="sec trips">
          <div className="wrap">
            {groups.size ? (
              <Filterable
                sticky
                label="اختر المدينة"
                all="كل المدن"
                options={[...groups.entries()].map(([slug, g]) => ({ value: slug, label: g.name }))}
                head={
                  <>
                    <div className="sec-head" style={{ marginTop: 36, marginBottom: 8 }}>
                      <h2>مشاوير نهاية الأسبوع</h2>
                      <span className="more" style={{ color: 'var(--ink2)', fontWeight: 400 }}>
                        {trips.length} مشوار
                      </span>
                    </div>
                    <p className="copy" style={{ fontSize: 15 }}>
                      اضغط على أي مكان لتفتح صفحته: وين تنام، وين تاكل، الطبيعة والآثار، السيران والتخييم، والموقع على الخريطة. يراجعها مراسل كل مدينة ويضيف تاريخ آخر تحقق.
                    </p>
                  </>
                }
                items={[...groups.entries()].map(([slug, g]) => ({
                  key: slug,
                  tags: [slug],
                  node: (
                    <div className="trip-group">
                      <header>
                        <h3>{g.from}</h3>
                        {slug !== 'other' && (
                          <Link className="more" href={localePath('ar', `/cities/${slug}`)}>
                            صفحة {g.name} ←
                          </Link>
                        )}
                      </header>
                      <div className="cards">
                        {g.items.map((i) => (
                          <Link className="pcard lift" key={i.id} href={tripPath(i)}>
                            {staticPhoto(`trip-${i.title}`) ? (
                              <span className="media short">
                                <Photo shot={i.title} fallback={`trip-${i.title}`} />
                                <span className="num">{num()}</span>
                              </span>
                            ) : (
                              <span className="trip-num">{num()}</span>
                            )}
                            <span className="body">
                              {i.tag && <span className="meta">{i.tag}</span>}
                              <h4 className="title">{i.title}</h4>
                              {i.description && <p style={{ fontSize: 15 }}>{i.description}</p>}
                              <span className="trip-has">فنادق · مطاعم · طبيعة وآثار · سيران · GPS</span>
                              <span className="go">افتح صفحة المكان ←</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ),
                }))}
              />
            ) : (
              <p className="empty">ما في مشاوير منشورة بعد.</p>
            )}
          </div>
        </section>

        {bloudan && (
          <section className="sec">
            <div className="wrap">
              <div className="sec-head">
                <div>
                  <span className="eyebrow">بيوت ريفية</span>
                  <h2>مصايف وبيوت ريفية للعيلة</h2>
                  <p>للتجمعات العائلية والإجازات القصيرة.</p>
                </div>
                <Link className="more" href="/inside/bloudan">
                  صفحة بلودان ←
                </Link>
              </div>
              <Stays stays={bloudanStays} settings={settings} cityName={text(bloudan.name, 'ar') ?? 'بلودان'} locale="ar" fallback="gallery-bloudan-0" citySlug="bloudan" />
            </div>
          </section>
        )}

        <section className="sec alt">
          <div className="wrap" style={{ paddingBlock: 24 }}>
            <div className="sec-head">
              <div>
                <h2>كل المدن</h2>
                <p>لكل مدينة: حال البلد اليوم، المعالم، المطاعم والكافيهات، الحدائق، ومعرض صور.</p>
              </div>
            </div>
            <div className="cards city-cards">
              {cities.map((c) => (
                <Link key={c.id} className="ccard lift" href={localePath('ar', `/cities/${c.slug}`)}>
                  <span className="eyebrow">{text(c.tag, 'ar')}</span>
                  <b>{text(c.name, 'ar')}</b>
                  <span>{text(c.lede, 'ar')}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ArabicOnly>
    </Page>
  )
}
