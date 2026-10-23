import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArabicOnly } from '@/components/ArabicOnly'
import { Filterable } from '@/components/client/Filterable'
import { ReportList, SectionHead, Stays, text } from '@/components/content'
import { asDoc, getCity, getDayTrips, getLatestReports, getSettings, getStays, type DayTripDoc } from '@/data/queries'
import { isLocale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    locale,
    path: '/inside',
    title: 'جوّا سوريا',
    description: 'مشاوير قريبة من مدينتك، ومصايف وبيوت ريفية للعيلة، وتقارير الموسم أول بأول.', arabicOnly: true,
  })
}

/** "Inside Syria": Arabic only (SPEC §5.3). */
export default async function InsidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const [trips, bloudan, reports, settings] = await Promise.all([getDayTrips(), getCity('bloudan'), getLatestReports(3), getSettings()])
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

  return (
    <Page locale={locale} path="/inside">
    <ArabicOnly locale={locale}>
      <section className="s">
        <div className="wrap stack">
          <span className="kicker">جوّا سوريا</span>
          <h1>وين نروح هالجمعة؟</h1>
          <p style={{ color: 'var(--ink2)' }}>مشاوير قريبة من مدينتك، ومصايف وبيوت ريفية للعيلة، وتقارير الموسم أول بأول.</p>
        </div>
      </section>

      <section className="s">
        <div className="wrap">
          <SectionHead title="مشاوير نهاية الأسبوع" lede="حسب أقرب مدينة إلك. الطرق والمسافات منحدّثها مع كل تقرير." />
          {groups.size ? (
            <Filterable
              label="اختر المدينة"
              all="كل المدن"
              options={[...groups.entries()].map(([slug, g]) => ({ value: slug, label: g.name }))}
              items={[...groups.entries()].map(([slug, g]) => ({
                key: slug,
                tags: [slug],
                node: (
                  <div className="trip-group">
                    <header>
                      <h3>{g.from}</h3>
                      {slug !== 'other' && (
                        <Link className="link" href={localePath('ar', `/cities/${slug}`)}>
                          صفحة {g.name}
                        </Link>
                      )}
                    </header>
                    <div className="grid g3">
                      {g.items.map((i) => (
                        <div className="hotel lift" key={i.id}>
                          <h3>{i.title}</h3>
                          {i.description && <p>{i.description}</p>}
                        </div>
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
        <section className="s">
          <div className="wrap">
            <SectionHead
              title="مصايف وبيوت ريفية للعيلة"
              lede="للتجمعات العائلية والإجازات القصيرة."
              link={
                <Link className="link" href={localePath('ar', '/cities/bloudan')}>
                  بلودان
                </Link>
              }
            />
            <Stays stays={bloudanStays} settings={settings} cityName={text(bloudan.name, 'ar') ?? 'بلودان'} locale="ar" />
          </div>
        </section>
      )}

      <section className="s">
        <div className="wrap">
          <SectionHead
            title="تقارير الموسم"
            link={
              <Link className="link" href={localePath('ar', '/seasons')}>
                كل التقارير
              </Link>
            }
          />
          <ReportList reports={reports} locale="ar" />
        </div>
      </section>
    </ArabicOnly>
    </Page>
  )
}
