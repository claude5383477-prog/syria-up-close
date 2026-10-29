import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Page } from '@/components/Header'
import { Ablaq, SyrianFill } from '@/components/Patterns'
import { GuideCard, GuideSlot, langLabel } from '@/components/guides'
import { GuideFilter } from '@/components/client/GuideFilter'
import { asDoc, getGuides } from '@/data/queries'
import { isLocale } from '@/lib/i18n'
import { text } from '@/lib/localized'
import { pageMetadata } from '@/lib/seo'
import { describe, SITE_LINE } from '@/lib/seoText'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const n = (await getGuides()).length
  return pageMetadata({
    locale,
    path: '/guides',
    title: T('أدلاء سياحيون في سوريا', 'Local tour guides in Syria'),
    description: describe([
      n > 0
        ? T('أدلاء من المدينة يعرفون حاراتها وأكلها وقصصها، بلغتك. نتحقق من كل دليل قبل نشر ملفه، والحجز عن طريقنا', 'Local guides who know their city’s streets, food and stories, in your language. Every guide is checked by our team; book through us')
        : T('أدلاء من المدينة يعرفون حاراتها وأكلها وقصصها. نتعرّف على كل دليل ونتحقق منه قبل نشر ملفه هنا', 'Local guides who know their city’s streets, food and stories. We meet and check every guide before their profile appears here'),
      SITE_LINE[locale],
    ]),
  })
}

export default async function GuidesPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const guides = await getGuides()
  const cities = [...new Map(guides.flatMap((g) => (asDoc(g.city) ? [[asDoc(g.city)!.slug, text(asDoc(g.city)!.name, locale) ?? asDoc(g.city)!.slug] as const] : []))).entries()]
  const langs = [...new Set(guides.flatMap((g) => g.languages ?? []))]
  return (
    <Page locale={locale} path="/guides">
      <section className="dark band2 guides-hero">
        <SyrianFill id="aleppo" opacity={0.08} />
        <div className="wrap">
          <div className="intro">
            <span className="eyebrow">{T('بالعربي والإنجليزي', 'In Arabic and English')}</span>
            <h1 className="big">{T('أدلاء سياحيون، تحجزهم عن طريقنا', 'Local guides, booked through us')}</h1>
            <p className="lede">
              {T(
                'ناس من المدينة بيعرفوا حاراتها وأكلها وقصصها، بلغتك. منتعرّف على كل دليل ومنتأكد منه قبل ما ننشر ملفه.',
                'People from the city who know its streets, food and stories, in your language. We meet and check every guide before publishing their profile.',
              )}
            </p>
          </div>
          <div className="panel">
            <h2>{T('كيف بيصير الحجز', 'How booking works')}</h2>
            <ol className="steps">
              <li>{T('بتختار الدليل والمشوار والتاريخ.', 'Choose the guide, the trip and the date.')}</li>
              <li>{T('بيوصلنا طلبك، ومنتواصل مع الدليل.', 'Your request reaches us and we contact the guide.')}</li>
              <li>{T('منبعتلك التأكيد والتفاصيل بالإيميل أو واتساب.', 'We send you the confirmation and details by e-mail or WhatsApp.')}</li>
            </ol>
            <p className="fine">{T('ما في دفع بالموقع. الكلفة يتفق عليها الدليل معك وتوصلك مع التأكيد.', 'No payment on the site. The guide agrees the cost with you and it comes with the confirmation.')}</p>
          </div>
        </div>
      </section>
      <Ablaq />
      <section className="sec">
        <div className="wrap">
          <GuideFilter
            items={guides.map((g) => ({ key: String(g.id), city: asDoc(g.city)?.slug ?? '', langs: g.languages ?? [], node: <GuideCard g={g} locale={locale} /> }))}
            cities={cities.map(([value, label]) => ({ value, label }))}
            langs={langs.map((l) => ({ value: l, label: langLabel(l, locale) }))}
            text={{ city: T('المدينة', 'City'), lang: T('اللغة', 'Language'), all: T('الكل', 'All'), count: T('{n} دليل', '{n} guides'), none: T('ما في دليل بهالمدينة وهاللغة بعد.', 'No guide for this city and language yet.') }}
            empty={
              <>
                <GuideSlot locale={locale} city={T('دمشق', 'Damascus')} />
                <GuideSlot locale={locale} city={T('حلب', 'Aleppo')} />
                <GuideSlot locale={locale} city={T('حمص', 'Homs')} />
              </>
            }
          />
          <p className="fine">
            {T(
              'كل دليل منشور هون التقيناه وتحققنا منه، وتاريخ التحقق على ملفه. لسنا جهة رسمية: الحجز طلب، والتأكيد يصلك منا بعد ما نحكي الدليل.',
              'Every guide here has been met and checked by us; the date is on their profile. We are not an official body: a booking is a request, confirmed by us after we speak to the guide.',
            )}
          </p>
        </div>
      </section>
    </Page>
  )
}
