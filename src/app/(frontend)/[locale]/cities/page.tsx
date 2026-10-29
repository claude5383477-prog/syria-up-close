import { pageMetadata } from '@/lib/seo'
import { SyrianFill } from '@/components/Patterns'
import { Page } from '@/components/Header'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CityCards } from '@/components/content'
import { isLocale } from '@/lib/i18n'
import { getMainCities } from '@/data/queries'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    locale,
    path: '/cities',
    title: locale === 'en' ? 'Cities' : 'المدن',
    description: locale === 'en' ? 'For each city: today’s status, what to see, what to eat, where to stay.' : 'لكل مدينة: حال البلد اليوم، ماذا ترى، ماذا تأكل، وأين تقيم.',
  })
}

export default async function CitiesPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const cities = await getMainCities()
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  return (
    <Page locale={locale} path="/cities">
      <section className="dark band2">
        <SyrianFill id="muq" opacity={0.12} />
        <div className="wrap page-hero" style={{ paddingTop: 72, paddingBottom: 64 }}>
          <span className="eyebrow rise">{T(`${cities.length} مدينة رئيسية`, `${cities.length} main cities`)}</span>
          <h1 className="big rise2">{T('المدن', 'Cities')}</h1>
          <p className="lede rise3" style={{ fontSize: 21, maxWidth: 680 }}>
            {T('مراكز المحافظات. لكل مدينة: حال البلد اليوم، المعالم، المطاعم والكافيهات، الحدائق، معرض صور، ومشاوير ريفها ومصايفه.', 'The provincial capitals. For each: today’s status, sights, restaurants and cafes, parks, a photo gallery, and trips into its countryside.')}
          </p>
        </div>
      </section>
      <section className="sec bottom" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <CityCards cities={cities} locale={locale} />
        </div>
      </section>
    </Page>
  )
}
