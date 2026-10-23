import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Loc } from '@/components/content'
import { Stamp } from '@/components/Stamp'
import { asDoc, getAllStays, getCities, getFirstVisitPages, getSettings } from '@/data/queries'
import { Filterable } from '@/components/client/Filterable'
import { Planner } from '@/components/client/Planner'
import { splitStays } from '@/lib/stays'
import { text } from '@/lib/localized'
import Image from 'next/image'
import { FIRST_VISIT } from '@/lib/firstVisitTopics'
import { isLocale, type Locale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    locale,
    path: '/outside',
    title: locale === 'en' ? 'Coming from abroad' : 'جاي من برّا',
    description: locale === 'en' ? 'Your first visit, or your first in years: everything you need before you travel, dated.' : 'زيارتك الأولى، أو أول زيارة من سنين: كل ما تحتاجه قبل السفر، مؤرخ بتاريخ آخر تحقق.',
  })
}

export default async function OutsidePage({ params }: Props) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const [pages, cities, stays, settings] = await Promise.all([getFirstVisitPages(), getCities(), getAllStays(), getSettings()])
  const published = new Map(pages.map((p) => [p.topic, p]))
  const cityName = (slug: string) => text(cities.find((c) => c.slug === slug)?.name, locale) ?? slug
  const cityNames = Object.fromEntries(cities.map((c) => [c.slug, text(c.name, locale) ?? c.slug]))
  // Ahleen hotels grouped by city, and each city's Ahleen page for the planner's stay links.
  const bySlug = new Map<string, typeof stays>()
  for (const st of stays) {
    const slug = asDoc(st.city)?.slug
    if (!slug) continue
    if (!bySlug.has(slug)) bySlug.set(slug, [])
    bySlug.get(slug)!.push(st)
  }
  const stayHrefs: Record<string, string> = {}
  const hotels: { slug: string; stay: (typeof stays)[number] }[] = []
  for (const [slug, list] of bySlug) {
    const split = splitStays(list)
    if (split.cityPage) stayHrefs[slug] = split.cityPage
    for (const h of split.hotels) if (h.ahleenUrl) hotels.push({ slug, stay: h })
  }
  const hotelCities = [...new Set(hotels.map((h) => h.slug))]
  const guide = localePath(locale, '/outside/first-visit')

  const disclosure = text(settings.disclosureText, locale)

  return (
    <Page locale={locale} path="/outside">
      <section className="dark band2">
        <div className="wrap page-hero" style={{ paddingTop: 64, paddingBottom: 64 }}>
          <div className="hero-top">
            <span className="eyebrow rise">{T('للمهجر والعرب والأجانب', 'For the diaspora, Arab and foreign visitors')}</span>
            <div className="lang-pills" role="group" aria-label="اللغة / Language">
              <Link href="/outside" lang="ar" hrefLang="ar" aria-current={locale === 'ar' ? 'page' : undefined}>
                عربي
              </Link>
              <Link href="/en/outside" lang="en" hrefLang="en" aria-current={locale === 'en' ? 'page' : undefined}>
                English
              </Link>
            </div>
          </div>
          <h1 className="big rise2">{T('جاي من برّا', 'Coming from abroad')}</h1>
          <p className="lede rise3" style={{ fontSize: 21, maxWidth: 700 }}>
            {T('أول زيارة لسوريا أو أول رجعة بعد سنين؟ كل ما تحتاجه قبل السفر، بمصدر رسمي وتاريخ آخر تحقق.', 'A first visit to Syria, or the first trip back in years? What you need before you travel, with an official source and a last-checked date.')}
          </p>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 64, paddingBottom: 32 }}>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2>{T('قبل السفر', 'Before you travel')}</h2>
              <p>{T('خمس صفحات، لكل منها رابط للمصدر الرسمي وتاريخ آخر تحقق.', 'Five pages, each linking to its official source with the date it was last checked.')}</p>
            </div>
            <Link className="more" href={guide}>
              {T('اقرأ الدليل كاملاً ←', 'Read the full guide →')}
            </Link>
          </div>
          <div className="tiles two">
            {FIRST_VISIT.map((f, i) => {
              const page = published.get(f.topic)
              return (
                <Link key={f.topic} className="tile white lift" href={page ? `${guide}/${f.topic}` : guide}>
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{page ? <Loc v={page.title} locale={locale} /> : f.title[locale]}</h3>
                  <span className="desc">{page ? <Loc v={page.summary} locale={locale} /> : f.summary[locale]}</span>
                  {page?.lastVerifiedAt ? (
                    <Stamp verifiedAt={page.lastVerifiedAt} maxAgeDays={settings.staleness?.firstVisitDays ?? 90} locale={locale} />
                  ) : (
                    <span className="wait">{T('بانتظار أول تحقق', 'Awaiting first check')}</span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="sec alt">
        <div className="wrap" style={{ paddingBlock: 24 }}>
          <Planner
            locale={locale}
            cityNames={cityNames}
            stayHref={settings.ahleenBaseUrl}
            stayHrefs={stayHrefs}
            intro={
              <>
                <span className="eyebrow">{T('أداة: خطّط مشوارك', 'Tool: plan your trip')}</span>
                <h2 className="h-xl">{T('كم يوم عندك، وشو بتحب؟', 'How many days, and what do you love?')}</h2>
                <p className="copy" style={{ fontSize: 17 }}>
                  {T('اختر عدد الأيام واهتماماتك، ونقترح عليك ترتيب المدن مع إقامة لكل محطة.', 'Pick your days and interests, and we suggest an order of cities with a stay for each stop.')}
                </p>
              </>
            }
            interestLabels={{
              history: T('تاريخ وآثار', 'History'),
              food: T('أسواق ومطبخ', 'Souqs and food'),
              nature: T('جبال وطبيعة', 'Mountains'),
              sea: T('بحر', 'Sea'),
              family: T('زيارة الأهل', 'Visiting family'),
            }}
            text={{
              days: T('عدد الأيام', 'Days'),
              interests: T('اهتماماتك', 'Interests'),
              head: T('خطتك: {d} أيام', 'Your plan: {d} days'),
              dayUnit: T('أيام', 'days'),
              stay: T('إقامات مقترحة عبر أهلين ↗', 'Suggested stays on Ahleen ↗'),
              note: T('مثال توضيحي لطريقة عمل الأداة؛ الخطة النهائية يراجعها فريق التحرير.', 'An illustration of how the tool works; final plans are reviewed by the editors.'),
            }}
          />
        </div>
      </section>

      <section className="dark band2" id="hotels">
        <div className="wrap" style={{ paddingBlock: 80 }}>
          <div className="sec-head" style={{ marginBottom: 24 }}>
            <div>
              <span className="eyebrow">{T('الفنادق', 'Hotels')}</span>
              <h2 className="h-2xl" style={{ fontSize: 'clamp(34px, 4.2vw, 48px)' }}>
                {T('احجز فندقك عن طريق أهلين', 'Book your hotel through Ahleen')}
              </h2>
              <p>{T('فنادق وبيوت مختارة بصور حقيقية مؤرخة، والحجز يتم على منصة أهلين.', 'Selected hotels and houses with real, dated photos. Booking happens on Ahleen.')}</p>
            </div>
            <Image className="partner-logo" src="/brand/ahleen-cream.svg" alt={T('أهلين', 'Ahleen')} width={120} height={70} unoptimized style={{ marginInlineStart: 'auto' }} />
          </div>
          {hotels.length ? (
            <Filterable
              label={T('المدينة', 'City')}
              all={T('كل المدن', 'All cities')}
              options={hotelCities.map((slug) => ({ value: slug, label: cityName(slug) }))}
              className="hotel-grid"
              items={hotels.map(({ slug, stay }) => ({
                key: String(stay.id),
                tags: [slug],
                node: (
                  <a className="hcard lift" href={stay.ahleenUrl!} target="_blank" rel={settings.partnerLinkRel}>
                    <span className="meta">{cityName(slug)}</span>
                    <h3>
                      <Loc v={stay.title} locale={locale} />
                    </h3>
                    {text(stay.description, locale) && (
                      <p>
                        <Loc v={stay.description} locale={locale} />
                      </p>
                    )}
                    <b>
                      {T('احجز عبر أهلين', 'Book on Ahleen')} <span aria-hidden="true">↗</span>
                    </b>
                  </a>
                ),
              }))}
            />
          ) : (
            <p>{T('لا فنادق مدرجة بعد.', 'No hotels listed yet.')}</p>
          )}
          <a className="btn-pill" href={settings.ahleenBaseUrl} target="_blank" rel={settings.partnerLinkRel} style={{ marginTop: 26, minHeight: 54, fontSize: 17 }}>
            {T('كل الفنادق على ahleenbooking.com', 'All hotels on ahleenbooking.com')} <span aria-hidden="true">↗</span>
          </a>
          <p className="disclose-band">
            {disclosure} <Link href={localePath(locale, '/about')}>{T('كيف تعمل الشراكة', 'How the partnership works')}</Link>
          </p>
        </div>
      </section>

      <section className="sec" style={{ paddingBlock: 72 }}>
        <div className="wrap">
          <div className="sec-head" style={{ marginBottom: 12 }}>
            <h2>{T('اسأل ابن البلد', 'Ask a local')}</h2>
            <span className="soon-pill">{T('قريباً', 'Soon')}</span>
          </div>
          <p className="copy" style={{ fontSize: 17, maxWidth: 680, marginBottom: 24 }}>
            {T('وجه محلي ثابت لكل محافظة، يجيب كل أسبوع عن أسئلتكم بفيديو قصير من المكان نفسه.', 'One familiar local face per governorate, answering your questions every week in a short video from the place itself.')}
          </p>
          <div className="tiles two">
            {['damascus', 'aleppo', 'latakia', 'bloudan'].map((slug) => (
              <div key={slug} className="local">
                <span className="face" aria-hidden="true" />
                <b>{T('مراسل المدينة', 'City correspondent')}</b>
                <span>{cityName(slug)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Page>
  )
}
