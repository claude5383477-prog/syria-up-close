import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/lib/i18n'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return { title: locale === 'en' ? 'About' : 'من نحن' }
}

export default async function AboutPage({ params }: Props) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)

  return (
    <>
      <section className="s">
        <div className="wrap stack">
          <h1>{T('من نحن', 'About')}</h1>
          <p style={{ color: 'var(--ink2)' }}>
            {T(
              'سوريا عن قرب دليل سياحي مستقل، عربي أولاً. لسنا جهة رسمية ولا نبيع جولات.',
              "Syria Up Close is an independent, Arabic-first travel guide. We are not an official body and we don't sell tours.",
            )}
          </p>
        </div>
      </section>
      <section className="s">
        <div className="wrap grid g3" style={{ alignItems: 'start' }}>
          <div className="card" id="independence">
            <h2 style={{ fontSize: 22 }}>{T('الاستقلالية', 'Independence')}</h2>
            <p>
              {T(
                'نكتب عن الأماكن لأنها تستحق، لا لأن أحداً دفع. لا نذكر أهلين في كل مقال.',
                "We write about places because they're worth it, not because someone paid. Ahleen doesn't appear in every article.",
              )}
            </p>
          </div>
          <div className="card" id="partnership">
            <h2 style={{ fontSize: 22 }}>{T('الشراكة مع أهلين', 'Our partnership with Ahleen')}</h2>
            <p>
              {T(
                'أهلين شريكنا لحجز الإقامة. تظهر بطاقة "أين تقيم" في صفحات المدن والخطط فقط، حيث يحتاج القارئ إقامة فعلاً.',
                'Ahleen is our accommodation partner. The "Where to stay" card appears only on city and plan pages, where readers actually need a stay.',
              )}
            </p>
          </div>
          <div className="card" id="how-we-check">
            <h2 style={{ fontSize: 22 }}>{T('كيف نتحقق', 'How we check')}</h2>
            <p>
              {T(
                'كل معلومة عملية تحمل تاريخ آخر تحقق واسم من تحقق منها. لا نكتب ادعاءات عن الأمان أو الأسعار.',
                'Every practical fact carries the date of the last check and who checked it. We make no claims about safety or prices.',
              )}
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
