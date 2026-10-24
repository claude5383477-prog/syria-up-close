import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Loc, Photo, ReportList, text } from '@/components/content'
import { formatDate } from '@/components/Stamp'
import { GUIDE, STORIES } from '@/content/guide'
import { Map3D } from '@/components/client/Map3D'
import { Tilt } from '@/components/client/Tilt'
import Image from 'next/image'
import { Chip } from '@/components/ui'
import { asDoc, asMedia, damascusDate, getCities, getDailyDetail, getLatestReports, getStories } from '@/data/queries'
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
    description: locale === 'en' ? 'Syria as it is today, up close: dated information, people on the ground, photos from the place itself.' : 'سوريا كما هي اليوم، عن قرب: معلومات مؤرخة، وناس على الأرض، وصور من المكان نفسه.', absoluteTitle: true,
  })
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)

  const [detail, cities, reports, stories] = await Promise.all([getDailyDetail(damascusDate()), getCities(), getLatestReports(3), getStories(3)])
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
      <section className="dark home-hero">
        <div className="wrap">
          <div className="intro">
            <p className="badge rise">{T('دليل مستقل · معلومات مؤرخة من ناس على الأرض', 'An independent guide · dated information from people on the ground')}</p>
            <h1 className="big rise2">
              {T('سوريا كما هي اليوم، ', 'Syria as it is today, ')}
              <em>{T('عن قرب.', 'up close.')}</em>
            </h1>
            <p className="lede rise3">
              {T('كل مدينة بحالها اليوم، وأماكنها ومطاعمها وحدائقها، بصور من المكان نفسه وتاريخ آخر تحقق.', 'Every city as it is today, its places, restaurants and parks, with photos from the place itself and the date of the last check.')}
            </p>
            <div className="doors rise3" role="group" aria-label={T('أنت جوّا سوريا أو جاي من برّا؟', 'Are you in Syria, or coming from abroad?')}>
              <Link className="door on lift" href={localePath(locale, '/inside')}>
                <small>{T('أنت جوّا سوريا؟', 'In Syria?')}</small>
                <b>{T('مشاوير وبيوت ريفية ←', 'Day trips and rural homes →')}</b>
              </Link>
              <Link className="door lift" href={localePath(locale, '/outside')}>
                <small>{T('جاي من برّا؟', 'Coming from abroad?')}</small>
                <b>{T('أول زيارة وخطط رحلات ←', 'First visit and trip plans →')}</b>
              </Link>
            </div>
            <p className="small-note">
              {T(`${cities.length} مدينة على الخريطة · مرّر المؤشر فوق الخريطة لتدويرها، واختر مدينة.`, `${cities.length} places on the map · move over the map to turn it, and pick a city.`)}
            </p>
          </div>
          <Map3D
            cities={pins}
            outline={SYRIA_OUTLINE}
            label={T('خريطة المدن', 'Map of the cities')}
            open={T('افتح صفحة المدينة ←', 'Open the city page →')}
            note={T('النقاط: مواقع المدن بإحداثياتها التقريبية · الحدود: Natural Earth', 'Pins: approximate city locations · Borders: Natural Earth')}
          />
        </div>
      </section>

      <section className="sec top" aria-labelledby="detail-h">
        <div className="wrap detail-row">
          <div className="pic lift">
            <Photo media={detail?.photo} shot={(detail && (text(detail.place, locale) ?? text(detail.sentence, locale))) || T('صورة قريبة من حارة سورية', 'A close-up from a Syrian street')} tall fallback={GUIDE[detailCity?.slug ?? '']?.gallery[3] ?? 'u-house-6'} />
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
              <span className="eyebrow">{T(`${cities.length} مدينة ومصيفاً`, `${cities.length} cities and resorts`)}</span>
              <h2>{T('المدن', 'Cities')}</h2>
            </div>
            <Link className="more" href={localePath(locale, '/cities')}>
              {T('كل صفحات المدن ←', 'All city pages →')}
            </Link>
          </div>
          <div className="tiles two">
            {cities.map((c, i) => (
              <Link key={c.id} className="tile lift" href={localePath(locale, `/cities/${c.slug}`)}>
                <span className="num">{pad(i + 1)}</span>
                <h3>
                  <b>
                    <Loc v={c.name} locale={locale} />
                  </b>
                </h3>
                <span>
                  <Loc v={c.tag} locale={locale} />
                </span>
              </Link>
            ))}
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
            <Tilt className="tilt">
              <span className="floor" aria-hidden="true" />
              <div className="slab">
                <span className="edge" aria-hidden="true" />
                <Image className="photo-main" src="/photos/shawarma-plate.jpg" alt={T('صحن شاورما عربي مع بطاطا وثومية ومخلل', 'A plate of shawarma arabi with fries, garlic sauce and pickles')} width={840} height={840} sizes="(max-width: 760px) 90vw, 420px" />
                <span className="sheen" aria-hidden="true" />
                <Image className="pop" src="/photos/shawarma-pile.webp" alt="" width={840} height={840} sizes="(max-width: 760px) 90vw, 420px" aria-hidden="true" />
                <span className="credit" lang="en">
                  <a href="https://commons.wikimedia.org/wiki/File:Arabic_Shawarma.jpg" target="_blank" rel="noopener">
                    Photo: Emnamizouni · CC BY-SA 4.0 · edited
                  </a>
                </span>
              </div>
            </Tilt>
          </div>
        </div>
      </section>

      <section className="dark band2 blog-band">
        <div className="wrap">
          <div className="txt">
            <span className="eyebrow">{T('جديد: المدونة', 'New: the blog')}</span>
            <h2 className="h-2xl">{T('قصص من الأرض، لا من الكتيّبات.', 'Stories from the ground, not from brochures.')}</h2>
            <p className="copy">{T('تقارير الموسم، وقصص "عن قرب"، ودليل أول زيارة، ومطبخ كل مدينة، في مكان واحد.', 'Season reports, up-close stories, first-visit notes and each city’s food, in one place.')}</p>
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
