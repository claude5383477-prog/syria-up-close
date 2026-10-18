import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Crumbs, JsonLd, Loc, Photo, SectionHead, StatusBoard, Stays, text } from '@/components/content'
import { siteBase, touristDestinationLd } from '@/lib/jsonld'
import { Card, Chip, SoonTag } from '@/components/ui'
import { isLocale, type Locale } from '@/lib/i18n'
import { isTranslated } from '@/lib/localized'
import { asMedia, getCities, getCity, getPlaces, getSettings, getStatusItems, getStays } from '@/data/queries'
import { localePath } from '@/lib/routing'

// Hourly regeneration lets "may be out of date" appear without anyone publishing (SPEC §5.3);
// publishing anything revalidates immediately (hooks/revalidate).
export const revalidate = 3600

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const cities = await getCities()
  return cities.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const city = isLocale(locale) ? await getCity(slug) : null
  if (!city || !isLocale(locale)) return {}
  return pageMetadata({
    locale,
    path: `/cities/${slug}`,
    title: text(city.name, locale) ?? slug,
    description: text(city.lede, locale) ?? undefined,
    // English page with untranslated main content stays out of the index until translated (س-9).
    translated: isTranslated([city.name, city.lede], 'en'),
    ownImage: true,
  })
}

export default async function CityPage({ params }: Props) {
  const { locale: l, slug } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const city = await getCity(slug)
  if (!city) notFound()

  const [places, items, stays, settings] = await Promise.all([getPlaces(city.id), getStatusItems(city.id), getStays(city.id), getSettings()])
  const name = text(city.name, locale) ?? slug
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)

  return (
    <Page locale={locale} path={`/cities/${slug}`}>
      <JsonLd
        data={touristDestinationLd({
          base: siteBase(),
          locale,
          path: localePath(locale, `/cities/${slug}`),
          name,
          description: text(city.lede, locale) ?? undefined,
          image: asMedia(city.coverImage)?.sizes?.hero?.url ?? asMedia(city.coverImage)?.url ?? undefined,
        })}
      />
      <div className="wrap city-hero">
        <Crumbs items={[{ href: localePath(locale, '/cities'), label: T('المدن', 'Cities') }, { label: <Loc v={city.name} locale={locale} /> }]} />
        <Photo media={city.coverImage} shot={text(city.coverShotNote, locale) ?? ''} size="hero" priority />
        <div className="chips">
          <Chip kind="city">
            <Loc v={city.name} locale={locale} />
          </Chip>
          {text(city.tag, locale) && (
            <Chip kind="cat">
              <Loc v={city.tag} locale={locale} />
            </Chip>
          )}
        </div>
        <h1>
          <Loc v={city.name} locale={locale} />
        </h1>
        <p style={{ color: 'var(--ink2)', fontSize: 18 }}>
          <Loc v={city.lede} locale={locale} />
        </p>
      </div>

      <section className="s">
        <div className="wrap">
          <SectionHead
            title={T('حال البلد اليوم', 'Status today')}
            lede={T(`يحدّثها مراسلنا في ${name} أسبوعياً.`, `Updated weekly by our ${name} correspondent.`)}
          />
          <StatusBoard cityName={name} items={items} locale={locale} maxAgeDays={settings.staleness?.statusDays ?? 7} />
        </div>
      </section>

      <section className="s">
        <div className="wrap">
          <SectionHead title={T('ماذا ترى', 'What to see')} />
          {places.length ? (
            <div className="grid g3">
              {places.map((p) => (
                <Card key={p.id} title={<Loc v={p.title} locale={locale} />} media={<Photo media={p.image} shot={text(p.description, locale) ?? ''} />}>
                  <p>
                    <Loc v={p.description} locale={locale} />
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <p className="empty">{T('لم نضف أماكن لهذه المدينة بعد.', 'No places added for this city yet.')}</p>
          )}
        </div>
      </section>

      <section className="s">
        <div className="wrap grid g2" style={{ alignItems: 'start' }}>
          <div className="card">
            <h2>{T('ماذا تأكل', 'What to eat')}</h2>
            <p style={{ fontSize: 17 }}>
              <Loc v={city.eat} locale={locale} />
            </p>
          </div>
          <div className="card">
            <h2>
              {T('مشي معنا', 'Walk with us')}
              <SoonTag locale={locale} />
            </h2>
            <p style={{ fontSize: 17 }}>
              {T(
                `فيديو مشي من منظور العين في أسواق ${name} وحاراتها، مربوط بمسار على الخريطة.`,
                `An eye-level walking video through ${name}'s streets, tied to a route on the map.`,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="s">
        <div className="wrap">
          <Stays stays={stays} settings={settings} cityName={name} locale={locale} />
        </div>
      </section>
    </Page>
  )
}
