import type { Metadata } from 'next'
import { SyrianFill } from '@/components/Patterns'
import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import { notFound } from 'next/navigation'
import { ArabicOnly } from '@/components/ArabicOnly'
import { ReportList } from '@/components/content'
import { getLatestReports } from '@/data/queries'
import { isLocale } from '@/lib/i18n'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    locale,
    path: '/seasons',
    title: 'تقارير الموسم',
    description: 'تقارير ميدانية قصيرة بتاريخها: ثلج، قطاف، زهر. كل تقرير من مراسل بالمكان نفسه.', arabicOnly: true,
  })
}

/** Season reports: Arabic only (SPEC §5.3). */
export default async function SeasonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const reports = await getLatestReports(100)
  return (
    <Page locale={locale} path="/seasons">
    <ArabicOnly locale={locale}>
      <section className="dark band2">
        <SyrianFill id="aleppo" opacity={0.1} />
        <div className="wrap page-hero">
          <span className="eyebrow rise">تقارير الموسم</span>
          <h1 className="big rise2">شو صاير هلق بالطبيعة؟</h1>
          <p className="lede rise3">تقارير ميدانية قصيرة بتاريخها: ثلج، قطاف، زهر. كل تقرير من مراسل بالمكان نفسه.</p>
        </div>
      </section>
      <section className="s">
        <div className="wrap">
          <ReportList reports={reports} locale={locale} />
        </div>
      </section>
    </ArabicOnly>
    </Page>
  )
}
