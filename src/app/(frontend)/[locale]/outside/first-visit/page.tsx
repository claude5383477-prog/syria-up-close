import { pageMetadata } from '@/lib/seo'
import { describe, SITE_LINE } from '@/lib/seoText'
import { SyrianFill } from '@/components/Patterns'
import { Page } from '@/components/Header'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Crumbs, Loc } from '@/components/content'
import { Stamp } from '@/components/Stamp'
import { getFirstVisitPages, getSettings } from '@/data/queries'
import { FIRST_VISIT } from '@/lib/firstVisitTopics'
import { isLocale, type Locale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  return pageMetadata({
    locale,
    path: '/outside/first-visit',
    title: T('دليل أول زيارة لسوريا', 'First visit to Syria: a practical guide'),
    description: describe([
      T('التأشيرة، الوصول، المال، الاتصالات، التنقل: كل صفحة تُنشر بعد التحقق منها مع مصدرها الرسمي', 'Visa, getting there, money, staying connected, getting around: each page is published once checked against its official source'),
      SITE_LINE[locale],
    ]),
  })
}

export default async function FirstVisitIndex({ params }: Props) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const [pages, settings] = await Promise.all([getFirstVisitPages(), getSettings()])
  const published = new Map(pages.map((p) => [p.topic, p]))
  const maxAge = settings.staleness?.firstVisitDays ?? 30

  return (
    <Page locale={locale} path="/outside/first-visit">
      <section className="dark band2">
        <SyrianFill id="mash" opacity={0.12} />
        <div className="wrap page-hero">
          <Crumbs items={[{ href: localePath(locale, '/outside'), label: T('جاي من برّا', 'Coming from abroad') }, { label: T('أول زيارة', 'First visit') }]} />
          <h1 className="big rise2">{T('دليل أول زيارة', 'First-visit guide')}</h1>
          <p className="lede rise3">
            {T(
              'خمس صفحات عملية. ننشر كل صفحة بعد التحقق منها مع رابط المصدر الرسمي، وتحمل تاريخ آخر تحقق.',
              'Five practical pages. Each goes live once checked, with a link to the official source and the date of the last check.',
            )}
          </p>
        </div>
      </section>
      <section className="s">
        <div className="wrap">
          <ol className="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {FIRST_VISIT.map((f, i) => {
              const page = published.get(f.topic)
              return (
                <li className="li" key={f.topic} data-topic={f.topic}>
                  <div>
                    {page ? (
                      <Link className="title" href={localePath(locale, `/outside/first-visit/${f.topic}`)}>
                        <b>
                          {i + 1}. <Loc v={page.title} locale={locale} />
                        </b>
                      </Link>
                    ) : (
                      <b>
                        {i + 1}. {f.title[locale]}
                      </b>
                    )}
                    <span>{page ? <Loc v={page.summary} locale={locale} /> : f.summary[locale]}</span>
                  </div>
                  <Stamp verifiedAt={page?.lastVerifiedAt ?? null} maxAgeDays={maxAge} locale={locale} />
                </li>
              )
            })}
          </ol>
          <p className="note" style={{ marginTop: 24, maxWidth: 'none' }}>
            {T(
              'القواعد تتغير بسرعة. إن وجدت معلومة قديمة في أي صفحة، راسلنا لنتحقق منها ونحدّث تاريخها.',
              "Rules change fast. If you spot something outdated on any page, tell us and we'll re-check and re-date it.",
            )}
          </p>
        </div>
      </section>
    </Page>
  )
}
