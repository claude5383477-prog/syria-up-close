import { Page } from '@/components/Header'
import { notFound } from 'next/navigation'
import { ArabicOnly } from '@/components/ArabicOnly'
import { ReportList } from '@/components/content'
import { getLatestReports } from '@/data/queries'
import { isLocale } from '@/lib/i18n'

export const revalidate = 3600

export const metadata = { title: 'تقارير الموسم' }

/** Season reports: Arabic only (SPEC §5.3). */
export default async function SeasonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const reports = await getLatestReports(100)
  return (
    <Page locale={locale} path="/seasons">
    <ArabicOnly locale={locale}>
      <section className="s">
        <div className="wrap stack">
          <span className="kicker">تقارير الموسم</span>
          <h1>شو صاير هلق بالطبيعة؟</h1>
          <p style={{ color: 'var(--ink2)' }}>تقارير ميدانية قصيرة بتاريخها: ثلج، قطاف، زهر. كل تقرير من مراسل بالمكان نفسه.</p>
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
