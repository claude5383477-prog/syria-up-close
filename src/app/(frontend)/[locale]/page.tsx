import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CityCards, Loc, Photo, ReportList, SectionHead, text } from '@/components/content'
import { Mark } from '@/components/Logo'
import { Chip } from '@/components/ui'
import { asDoc, damascusDate, getCities, getDailyDetail, getLatestReports } from '@/data/queries'
import { isLocale, type Locale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

// Hourly, so "today's detail" rolls over without a publish; publishes revalidate at once.
export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    locale,
    path: '/',
    title: locale === 'en' ? 'Syria Up Close' : 'سوريا عن قرب',
    description: locale === 'en' ? 'Syria as it is today, up close: dated information, people on the ground, photos from the place itself.' : 'سوريا كما هي اليوم، عن قرب: معلومات مؤرخة، وناس على الأرض، وصور من المكان نفسه.', absoluteTitle: true,
  })
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)

  const [detail, cities, reports] = await Promise.all([getDailyDetail(damascusDate()), getCities(), getLatestReports(3)])
  const detailCity = asDoc(detail?.city)

  return (
    <Page locale={locale} path="/">
      <section className="hero">
        <div className="wrap">
          <div>
            <span className="kicker">{T('دليل مستقل', 'An independent guide')}</span>
            <h1>{T('سوريا كما هي اليوم، عن قرب.', 'Syria as it is today, up close.')}</h1>
            <p>{T('معلومات مؤرخة، وناس على الأرض، وصور من المكان نفسه.', 'Dated information, people on the ground, photos from the place itself.')}</p>
            <div className="ask">
              <div className="q">{T('أنت جوّا سوريا أو جاي من برّا؟', 'Are you in Syria, or coming from abroad?')}</div>
              <div className="paths">
                <Link className="path" href={localePath(locale, '/inside')}>
                  <b>{T('جوّا سوريا', "I'm in Syria")}</b>
                  <span>{T('مشاوير وإجازات قصيرة وبيوت ريفية', 'Day trips, short breaks, rural homes')}</span>
                </Link>
                <Link className="path" href={localePath(locale, '/outside')}>
                  <b>{T('جاي من برّا', 'Coming from abroad')}</b>
                  <span>{T('أول زيارة وخطط رحلات ومعلومات عملية', 'First visit, trip plans, practical info')}</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="hero-mark">
            <Mark size={260} />
          </div>
        </div>
      </section>

      <section className="s" aria-labelledby="detail-h">
        {detail ? (
          <div className="wrap detail">
            <Photo media={detail.photo} shot={text(detail.place, locale) ?? text(detail.sentence, locale) ?? ''} tall />
            <div className="stack" style={{ gap: 14 }}>
              <span className="kicker">
                {T('تفصيلة اليوم', "Today's detail")}
                {text(detail.place, locale) && (
                  <>
                    {' · '}
                    {T('من ', '')}
                    <Loc v={detail.place} locale={locale} />
                  </>
                )}
              </span>
              <h2 id="detail-h">
                <Loc v={detail.sentence} locale={locale} />
              </h2>
              <p style={{ color: 'var(--ink2)' }}>
                {T(
                  'نختار كل يوم تفصيلة واحدة من حارة سورية، ونكتب عنها جملة واحدة بلغة بسيطة.',
                  'Each day we pick one detail from a Syrian street and write one plain sentence about it.',
                )}
              </p>
              {detailCity && (
                <div className="chips">
                  <Chip kind="city">
                    <Loc v={detailCity.name} locale={locale} />
                  </Chip>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="wrap stack">
            <span className="kicker">{T('تفصيلة اليوم', "Today's detail")}</span>
            <h2 id="detail-h">{T('بانتظار أول تفصيلة', 'Awaiting the first detail')}</h2>
            <p style={{ color: 'var(--ink2)' }}>
              {T(
                'نختار كل يوم تفصيلة واحدة من حارة سورية، ونكتب عنها جملة واحدة بلغة بسيطة.',
                'Each day we pick one detail from a Syrian street and write one plain sentence about it.',
              )}
            </p>
          </div>
        )}
      </section>

      <section className="s">
        <div className="wrap">
          <SectionHead
            title={T('المدن', 'Cities')}
            lede={T('لكل مدينة: حال البلد اليوم، ماذا ترى، ماذا تأكل، وأين تقيم.', "For each city: today's status, what to see, what to eat, where to stay.")}
          />
          <CityCards cities={cities} locale={locale} />
        </div>
      </section>

      <section className="s">
        <div className="wrap">
          <SectionHead
            title={<span lang="ar">تقارير الموسم</span>}
            lede={T('تقارير ميدانية مؤرخة من المراسلين.', 'Dated field reports from our correspondents (Arabic).')}
            link={
              <Link className="link" href={localePath(locale, '/seasons')}>
                {T('كل التقارير', 'All reports')}
              </Link>
            }
          />
          <ReportList reports={reports} locale={locale} />
        </div>
      </section>
    </Page>
  )
}
