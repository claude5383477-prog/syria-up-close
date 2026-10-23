import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Loc, SectionHead } from '@/components/content'
import { ButtonLink, Card, Chip, SoonTag } from '@/components/ui'
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

  return (
    <Page locale={locale} path="/outside">
      <section className="s">
        <div className="wrap stack">
          <span className="kicker">{T('جاي من برّا', 'Coming from abroad')}</span>
          <h1>{T('زيارتك الأولى، أو أول زيارة من سنين', 'Your first visit, or your first in years')}</h1>
          <p style={{ color: 'var(--ink2)' }}>
            {T('كل ما تحتاجه قبل السفر، مؤرخ بتاريخ آخر تحقق.', 'Everything you need before you travel, dated with when we last checked.')}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            <ButtonLink href={guide}>{T('دليل أول زيارة', 'First-visit guide')}</ButtonLink>
            <ButtonLink href={localePath(locale, '/cities')} ghost>
              {T('تصفّح المدن', 'Browse cities')}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="s">
        <div className="wrap">
          <SectionHead
            title={T('قبل السفر', 'Before you go')}
            link={
              <Link className="link" href={guide}>
                {T('اقرأ الدليل كاملاً', 'Read the full guide')}
              </Link>
            }
          />
          <div className="grid g3">
            {FIRST_VISIT.slice(0, 3).map((f) => {
              const page = published.get(f.topic)
              return (
                <Card
                  key={f.topic}
                  href={page ? `${guide}/${f.topic}` : guide}
                  eyebrow={<Chip kind="aud">{T('زيارة أولى', 'First visit')}</Chip>}
                  title={page ? <Loc v={page.title} locale={locale} /> : f.title[locale]}
                >
                  <p>{page ? <Loc v={page.summary} locale={locale} /> : f.summary[locale]}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="s">
        <div className="wrap">
          <SectionHead
            title={T('خطّط مشوارك', 'Plan your trip')}
            lede={T('اختر عدد الأيام واهتماماتك، ونقترح ترتيب المدن مع إقامة لكل محطة.', 'Pick your days and interests; we suggest an order of cities with a stay for each stop.')}
          />
          <Planner
            locale={locale}
            cityNames={cityNames}
            stayHref={settings.ahleenBaseUrl}
            stayHrefs={stayHrefs}
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
              note: T('مثال توضيحي لطريقة عمل الأداة؛ الخطط النهائية يراجعها فريق التحرير.', 'An illustration of how the tool works; final plans are reviewed by the editors.'),
            }}
          />
        </div>
      </section>

      <section className="s band" id="hotels">
        <div className="wrap">
          <div className="s-head">
            <div>
              <span className="kicker">{T('الفنادق', 'Hotels')}</span>
              <h2>{T('احجز فندقك عن طريق أهلين', 'Book your hotel through Ahleen')}</h2>
              <p>{T('فنادق وبيوت مختارة بصور حقيقية مؤرخة، والحجز يتم على منصة أهلين.', 'Selected hotels and houses with real, dated photos. Booking happens on Ahleen.')}</p>
            </div>
            <Image className="partner-logo" src="/brand/ahleen-cream.svg" alt={T('أهلين', 'Ahleen')} width={120} height={70} unoptimized />
          </div>
          {hotels.length ? (
            <Filterable
              label={T('المدينة', 'City')}
              all={T('كل المدن', 'All cities')}
              options={hotelCities.map((slug) => ({ value: slug, label: cityName(slug) }))}
              className="grid g3"
              items={hotels.map(({ slug, stay }) => ({
                key: String(stay.id),
                tags: [slug],
                node: (
                  <a className="hotel lift" href={stay.ahleenUrl!} target="_blank" rel={settings.partnerLinkRel} style={{ textDecoration: 'none' }}>
                    <span className="tag">{cityName(slug)}</span>
                    <h3>
                      <Loc v={stay.title} locale={locale} />
                    </h3>
                    {text(stay.description, locale) && (
                      <p>
                        <Loc v={stay.description} locale={locale} />
                      </p>
                    )}
                    <b style={{ color: 'var(--brand)' }}>
                      {T('احجز عبر أهلين', 'Book on Ahleen')} <span aria-hidden="true">↗</span>
                    </b>
                  </a>
                ),
              }))}
            />
          ) : (
            <p>{T('لا فنادق مدرجة بعد.', 'No hotels listed yet.')}</p>
          )}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 24 }}>
            <a className="btn" href={settings.ahleenBaseUrl} target="_blank" rel={settings.partnerLinkRel} style={{ background: 'var(--band-fg)', color: 'var(--band-bg)', borderColor: 'var(--band-fg)' }}>
              {T('كل الفنادق على ahleenbooking.com', 'All hotels on ahleenbooking.com')} <span aria-hidden="true">↗</span>
            </a>
            <span className="disclose" style={{ color: 'var(--band-muted)' }}>
              {text(settings.disclosureText, locale)} <Link href={localePath(locale, '/about')} style={{ color: 'var(--band-fg)' }}>{T('كيف تعمل الشراكة', 'How the partnership works')}</Link>
            </span>
          </div>
        </div>
      </section>

      <section className="s">
        <div className="wrap grid g2">
          <div className="card">
            <h3>
              {T('اسأل ابن البلد', 'Ask a local')}
              <SoonTag locale={locale} />
            </h3>
            <p>{T('وجه محلي لكل مدينة يجيب أسئلتك بفيديو قصير كل أسبوع.', 'A local face for each city answers your questions in a short weekly video.')}</p>
          </div>
          <div className="card">
            <h3>
              {T('حكي مع سوري', 'Talk to a Syrian')}
              <SoonTag locale={locale} />
            </h3>
            <p>{T('جلسات مباشرة شهرية مع سوريين متطوعين يجيبون عن أسئلة الزيارة الأولى.', 'Monthly live sessions with Syrian volunteers answering first-visit questions.')}</p>
          </div>
        </div>
      </section>
    </Page>
  )
}
