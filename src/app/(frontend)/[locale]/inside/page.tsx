import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArabicOnly } from '@/components/ArabicOnly'
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
  const groups = new Map<string, { from: string; items: DayTripDoc[] }>()
  for (const t of trips) {
    const city = asDoc(t.fromCity)
    const key = city?.slug ?? 'other'
    if (!groups.has(key)) groups.set(key, { from: city ? `من ${text(city.name, 'ar')}` : 'مشاوير', items: [] })
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
            <div className="grid g3">
              {[...groups.values()].map((g) => (
                <div className="stack" key={g.from} style={{ alignContent: 'start' }}>
                  <h3>{g.from}</h3>
                  <div className="list">
                    {g.items.map((i) => (
                      <div className="li one" key={i.id}>
                        <div>
                          <b>{i.title}</b>
                          {i.description && <span>{i.description}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
