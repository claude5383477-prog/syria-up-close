import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd, Loc, Photo, ReportList, text } from '@/components/content'
import { formatDate } from '@/components/Stamp'
import { GUIDE, STORIES } from '@/content/guide'
import { CityMap } from '@/components/client/CityMap'
import { Shawarma } from '@/components/client/Shawarma'
import Image from 'next/image'
import { PatternDefs, PatternFill, PatternBand } from '@/components/Patterns'
import { cityTheme } from '@/lib/cityTheme'
import { staticPhoto } from '@/content/photos'
import { Chip } from '@/components/ui'
import { asDoc, asMedia, damascusDate, getAllPlaces, getCities, getDailyDetail, getDayTrips, getLatestReports, getStories } from '@/data/queries'
import { SiteSearch } from '@/components/client/SiteSearch'
import { SWEETS } from '@/content/sweets'
import { siteBase, websiteLd } from '@/lib/jsonld'
import { mainCities, tripPath, type SearchItem } from '@/lib/rural'
import { cityPoint, SYRIA_OUTLINE } from '@/lib/geo'
import { isLocale, type Locale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'

// Hourly, so "today's detail" rolls over without a publish; publishes revalidate at once.
export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    locale,
    path: '/',
    title: locale === 'en' ? 'Syria Up Close' : 'سوريا عن قرب',
    description:
      locale === 'en'
        ? 'Syria as it is today, up close: dated information, people on the ground, photos from the place itself.'
        : 'سوريا كما هي اليوم، عن قرب: معلومات مؤرخة، وناس على الأرض، وصور من المكان نفسه.',
    absoluteTitle: true,
  })
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)

  const [detail, allCities, reports, stories, trips, allPlaces] = await Promise.all([getDailyDetail(damascusDate()), getCities(), getLatestReports(3), getStories(3), getDayTrips(), getAllPlaces()])
  // Main cities only on the map and the tiles; resorts and Palmyra are in their city's countryside.
  const cities = mainCities(allCities)
  const ruralOf = (id: number) => allCities.filter((c) => asDoc(c.parentCity)?.id === id || c.parentCity === id).map((c) => text(c.name, locale) ?? c.slug)
  const slugOf = new Map(allCities.map((c) => [c.id, c]))
  const search: SearchItem[] = [
    ...cities.map((c) => ({ name: text(c.name, locale) ?? c.slug, sub: text(c.tag, locale) ?? '', type: T('مدينة', 'City'), href: localePath(locale, `/cities/${c.slug}`) })),
    ...trips.map((tr) => ({ name: tr.title, sub: `${tr.tag ?? ''}${tr.tag ? ' · ' : ''}${T('ريف', 'Near')} ${text(asDoc(tr.fromCity)?.name, locale) ?? ''}`, type: T('ريف', 'Trip'), href: tripPath(tr) })),
    ...allPlaces.flatMap((pl) => {
      const c = typeof pl.city === 'number' ? slugOf.get(pl.city) : pl.city
      const n = text(pl.title, locale)
      if (!c || !n) return []
      // A resort's places live on its countryside page now.
      const trip = c.parentCity != null ? trips.find((tr) => (asDoc(tr.place)?.id ?? tr.place) === c.id) : undefined
      return [{ name: n, sub: text(c.name, locale) ?? c.slug, type: T('معلم', 'Sight'), href: trip ? `${tripPath(trip)}#ruins` : `${localePath(locale, `/cities/${c.slug}`)}#sights` }]
    }),
    ...Object.entries(SWEETS).flatMap(([slug, list]) => {
      const c = allCities.find((x) => x.slug === slug)
      return c ? list.map((s) => ({ name: s.name[locale], sub: text(c.name, locale) ?? slug, type: T('حلو', 'Sweet'), href: `${localePath(locale, `/cities/${slug}`)}#sweets` })) : []
    }),
  ]
  const detailCity = asDoc(detail?.city)
  const pins = cities.flatMap((c) => {
    const p = cityPoint(c.slug)
    if (!p) return []
    return [{ slug: c.slug, name: text(c.name, locale) ?? c.slug, tag: text(c.tag, locale) ?? '', lede: text(c.lede, locale) ?? '', href: localePath(locale, `/cities/${c.slug}`), ...p }]
  })

  const CAT = { story: T('عن قرب · قصة', 'Up close · story'), food: T('مطبخ', 'Food'), firstVisit: T('أول زيارة', 'First visit'), trails: T('دروب سوريا', 'Syria trails') }
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <Page locale={locale} path="/">
      <JsonLd data={websiteLd(siteBase())} />
      <section className="dark home-hero">
        <div className="wrap">
          <div className="intro">
            <p className="badge rise">{T('دليل مستقل · معلومات مؤرخة من ناس على الأرض', 'An independent guide · dated information from people on the ground')}</p>
            <h1 className="big rise2">
              {T('سوريا كما هي اليوم، ', 'Syria as it is today, ')}
              <em>{T('عن قرب.', 'up close.')}</em>
            </h1>
            <p className="lede rise3">
              {T(
                'كل مدينة بحالها اليوم، وأماكنها ومطاعمها وحدائقها، بصور من المكان نفسه وتاريخ آخر تحقق.',
                'Every city as it is today, its places, restaurants and parks, with photos from the place itself and the date of the last check.',
              )}
            </p>
            <div className="doors rise3" role="group" aria-label={T('أنت جوّا سوريا أو جاي من برّا؟', 'Are you in Syria, or coming from abroad?')}>
              <Link className="door on lift" href={localePath(locale, '/inside')}>
                {T('أنت جوّا سوريا؟', 'In Syria?')}
                <span aria-hidden="true">{T('←', '→')}</span>
              </Link>
              <Link className="door lift" href={localePath(locale, '/outside')}>
                {T('جاي من برّا؟', 'Coming from abroad?')}
                <span aria-hidden="true">{T('←', '→')}</span>
              </Link>
            </div>
            <SiteSearch
              items={search}
              label={T('ابحث عن مدينة أو مكان أو أكلة', 'Find a city, place or dish')}
              placeholder={T('مثلاً: بلودان، الجامع الأموي، حلاوة الجبن', 'e.g. Damascus, Umayyad Mosque, Aleppo')}
              none={T('ما لقينا شي بهالاسم. جرّب اسم مدينة أو مكان.', 'Nothing by that name. Try a city or a place.')}
              results={T('{n} نتيجة', '{n} results')}
            />
            <p className="small-note">{T(`${cities.length} مدينة رئيسية على الخريطة · أريافها داخل صفحة كل مدينة.`, `${cities.length} main cities on the map · their countryside is on each city page.`)}</p>
          </div>
          <CityMap
            cities={pins}
            outline={SYRIA_OUTLINE}
            label={T('خريطة المدن', 'Map of the cities')}
            open={T('افتح صفحة المدينة ←', 'Open the city page →')}
            note={T('مواقع الأسماء بإحداثيات المدن التقريبية · الحدود: Natural Earth', 'Names at approximate city locations · Borders: Natural Earth')}
          />
        </div>
      </section>

      <section className="sec top" aria-labelledby="detail-h">
        <div className="wrap detail-row">
          <div className="pic lift">
            <Photo
              media={detail?.photo}
              shot={(detail && (text(detail.place, locale) ?? text(detail.sentence, locale))) || T('صورة قريبة من حارة سورية', 'A close-up from a Syrian street')}
              tall
              fallback={GUIDE[detailCity?.slug ?? '']?.gallery[3] ?? 'u-house-6'}
            />
          </div>
          <div className="txt">
            <span className="eyebrow">
              {T('تفصيلة اليوم', "Today's detail")}
              {detail && text(detail.place, locale) && (
                <>
                  {' · '}
                  {T('من ', '')}
                  <Loc v={detail.place} locale={locale} />
                </>
              )}
            </span>
            <h2 id="detail-h">{detail ? <Loc v={detail.sentence} locale={locale} /> : T('بانتظار أول تفصيلة', 'Awaiting the first detail')}</h2>
            <p className="copy">
              {T('نختار كل يوم تفصيلة واحدة من حارة سورية، ونكتب عنها جملة واحدة بلغة بسيطة.', 'Each day we pick one detail from a Syrian street and write one plain sentence about it.')}
            </p>
            {detailCity && (
              <div className="chips">
                <Chip kind="city">
                  <Loc v={detailCity.name} locale={locale} />
                </Chip>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">{T(`${cities.length} مدينة رئيسية · والمصايف داخل صفحة كل مدينة`, `${cities.length} main cities · resorts are on each city page`)}</span>
              <h2>{T('المدن', 'Cities')}</h2>
            </div>
            <Link className="more" href={localePath(locale, '/cities')}>
              {T('كل صفحات المدن ←', 'All city pages →')}
            </Link>
          </div>
          <PatternDefs />
          <div className="tiles ctiles">
            {cities.map((c, i) => {
              const theme = cityTheme(c.slug)
              const thumb = staticPhoto(GUIDE[c.slug]?.gallery[0])
              return (
                <Link key={c.id} className="tile ctile lift" href={localePath(locale, `/cities/${c.slug}`)}>
                  <PatternFill id={theme.pattern} opacity={0.16} />
                  <PatternBand id={theme.pattern} />
                  <span className="txt">
                    <span className="num">{pad(i + 1)}</span>
                    <h3>
                      <b>
                        <Loc v={c.name} locale={locale} />
                      </b>
                    </h3>
                    <span>
                      <Loc v={c.tag} locale={locale} />
                      {' · '}
                      {theme.style[locale]}
                    </span>
                    {ruralOf(c.id).length > 0 && <span className="rural">{T('ريفها: ', 'Around it: ')}{ruralOf(c.id).join(' · ')}</span>}
                  </span>
                  {thumb && <Image className="thumb" src={thumb.src} alt="" width={64} height={64} sizes="64px" unoptimized={thumb.src.startsWith('https://')} />}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="sec bottom">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">{T('تقارير ميدانية مؤرخة', 'Dated field reports')}</span>
              <h2 lang="ar">تقارير الموسم</h2>
              <p>{T('تقارير ميدانية مؤرخة من المراسلين.', 'Dated field reports from our correspondents (Arabic).')}</p>
            </div>
            <Link className="more" href={localePath(locale, '/seasons')}>
              {T('كل التقارير ←', 'All reports →')}
            </Link>
          </div>
          {reports.length ? (
            <div className="cards c3" lang="ar" dir="rtl">
              {reports.map((r) => {
                const city = asDoc(r.city)
                return (
                  <Link key={r.id} className="pcard lift" href={localePath(locale, `/seasons/${r.slug}`)}>
                    <span className="media">
                      <Photo media={r.photos?.[0]} shot="صورة من المراسل" fallback={GUIDE[asDoc(r.city)?.slug ?? '']?.gallery[1]} />
                    </span>
                    <span className="body">
                      <span className="meta">
                        {city && text(city.name, 'ar')}
                        {' · '}
                        <time dateTime={r.fieldDate}>{formatDate(new Date(r.fieldDate), 'ar')}</time>
                      </span>
                      <span className="title">{r.title}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <ReportList reports={reports} locale={locale} />
          )}
        </div>
      </section>

      <section className="sec bottom">
        <div className="wrap">
          <div className="hungry2">
            <div className="txt">
              <span className="eyebrow">{T('جوعان؟', 'Hungry?')}</span>
              <h2 className="h-2xl">{T('شاورما عربي، والثومية جنبها.', 'Shawarma arabi, with the garlic sauce on the side.')}</h2>
              <p className="copy">
                {T(
                  'لحمة من السيخ على خبز محمّص، بطاطا ومخلل وثومية. لكل مدينة مطاعمها وكافيهاتها، يزورها مراسلنا ويكتب عنها بنفسه.',
                  'Meat off the spit on toasted bread, fries, pickles and garlic sauce. Every city has its own restaurants and cafes, visited and written up by our correspondent.',
                )}
              </p>
              <Link className="btn-pill" href={localePath(locale, '/cities/damascus#food')}>
                {T('مطاعم المدن ←', 'City restaurants →')}
              </Link>
            </div>
            <Shawarma
              make={T('اضغط لتحضير سندويشة شاورما', 'Press to make a shawarma wrap')}
              again={T('رجّع السيخ', 'Back to the spit')}
              hint={T('اضغط على السيخ وشوف شو بيطلع', 'Press the spit and see what comes out')}
              hintDone={T('اضغط مرة ثانية لسندويشة جديدة', 'Press again for another one')}
              said={T('صحتين وعافية!', 'Enjoy!')}
            />
          </div>
        </div>
      </section>

      <section className="dark band2 blog-band">
        <div className="wrap">
          <div className="txt">
            <span className="eyebrow">{T('جديد: المدونة', 'New: the blog')}</span>
            <h2 className="h-2xl">{T('قصص من الأرض، لا من الكتيّبات.', 'Stories from the ground, not from brochures.')}</h2>
            <p className="copy">
              {T('تقارير الموسم، وقصص "عن قرب"، ودليل أول زيارة، ومطبخ كل مدينة، في مكان واحد.', 'Season reports, up-close stories, first-visit notes and each city’s food, in one place.')}
            </p>
            <Link className="btn-pill" href={localePath(locale, '/blog')}>
              {T('ادخل المدونة ←', 'Open the blog →')}
            </Link>
          </div>
          <div className="mosaic">
            {stories.length
              ? stories.slice(0, 3).map((s) => (
                  <Link key={s.id} className="lift" href={localePath(locale, `/blog/${s.slug}`)}>
                    {asMedia(s.photos?.[0]) && <Photo media={s.photos?.[0]} shot="" />}
                    <small>{CAT[s.category ?? 'story']}</small>
                    <b>
                      <Loc v={s.title} locale={locale} />
                    </b>
                  </Link>
                ))
              : STORIES.slice(0, 3).map((g) => (
                  <Link key={g.slug} className="lift" href={localePath(locale, `/blog/${g.slug}`)}>
                    <Photo shot="" fallback={g.photos[0]} />
                    <small>{CAT[g.category]}</small>
                    <b>{g.title[locale]}</b>
                  </Link>
                ))}
          </div>
        </div>
      </section>
    </Page>
  )
}
