import { ArabicOnly } from '@/components/ArabicOnly'
import { isLocale } from '@/lib/i18n'
import { notFound } from 'next/navigation'

// Heading only for now; sections arrive in T21.
export default async function InsidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return (
    <ArabicOnly locale={locale}>
      <section className="s">
        <div className="wrap" style={{ display: 'grid', gap: 12 }}>
          <span className="kicker">جوّا سوريا</span>
          <h1>وين نروح هالجمعة؟</h1>
          <p style={{ color: 'var(--ink2)' }}>مشاوير قريبة من مدينتك، ومصايف وبيوت ريفية للعيلة، وتقارير الموسم أول بأول.</p>
        </div>
      </section>
    </ArabicOnly>
  )
}
