import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Page } from '@/components/Header'
import { Loc, Photo, text } from '@/components/content'
import { Filterable } from '@/components/client/Filterable'
import { formatDate } from '@/components/Stamp'
import { asDoc, asMedia, getLatestReports, getStories } from '@/data/queries'
import { isLocale, type Locale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'
import { pageMetadata } from '@/lib/seo'
import { STORIES } from '@/content/guide'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

const CATEGORIES = {
  seasons: { ar: 'تقارير الموسم', en: 'Season reports' },
  story: { ar: 'عن قرب', en: 'Up close' },
  food: { ar: 'مطبخ', en: 'Food' },
  firstVisit: { ar: 'أول زيارة', en: 'First visit' },
  trails: { ar: 'دروب سوريا', en: 'Syria trails' },
} as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return pageMetadata({
    locale,
    path: '/blog',
    title: locale === 'en' ? 'Blog' : 'المدونة',
    description:
      locale === 'en'
        ? 'Stories from the ground: season reports, up-close stories, food, first visits and trails.'
        : 'قصص من الأرض: تقارير الموسم، وقصص عن قرب، ومطبخ، وأول زيارة، ودروب سوريا.',
  })
}

/** The blog: published stories and season reports, newest first, filterable by category. */
export default async function BlogPage({ params }: Props) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const [stories, reports] = await Promise.all([getStories(60), getLatestReports(60)])

  const posts = [
    ...stories.map((s) => ({
      key: `s${s.id}`,
      date: s.publishedAt ?? s.updatedAt ?? '',
      tag: s.category ?? 'story',
      href: localePath(locale, `/blog/${s.slug}`),
      title: <Loc v={s.title} locale={locale} />,
      shot: text(s.title, locale) ?? '',
      media: asMedia(s.photos?.[0]),
      city: asDoc(s.city),
      by: null as string | null,
      fallback: undefined as string | undefined,
    })),
    ...reports.map((r) => ({
      key: `r${r.id}`,
      date: r.fieldDate,
      tag: 'seasons',
      href: localePath(locale, `/seasons/${r.slug}`),
      title: <span lang="ar">{r.title}</span>,
      shot: r.title,
      media: asMedia(r.photos?.[0]),
      city: asDoc(r.city),
      by: r.authorName ?? null,
      fallback: undefined as string | undefined,
    })),
    // Photo essays from the site's own collection (content/guide), unless an editor published the same slug.
    ...STORIES.filter((g) => !stories.some((s) => s.slug === g.slug)).map((g) => ({
      key: `g-${g.slug}`,
      date: g.date,
      tag: g.category as string,
      href: localePath(locale, `/blog/${g.slug}`),
      title: <Loc v={g.title} locale={locale} />,
      shot: g.title[locale],
      media: null,
      city: null,
      by: null as string | null,
      fallback: g.photos[0],
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const [top, ...rest] = posts
  const label = (p: (typeof posts)[number]) => CATEGORIES[p.tag as keyof typeof CATEGORIES]?.[locale]
  const meta = (p: (typeof posts)[number]) => (
    <>
      {p.city && <Loc v={p.city.name} locale={locale} />}
      {p.by && ` · ${p.by}`}
      {p.date && (
        <>
          {(p.city || p.by) && ' · '}
          {formatDate(new Date(p.date), locale)}
        </>
      )}
    </>
  )

  return (
    <Page locale={locale} path="/blog">
      <section className="wrap page-hero" style={{ paddingTop: 64, paddingBottom: 24, gap: 14 }}>
        <span className="eyebrow rise">{T('المدونة', 'Blog')}</span>
        <h1 className="big rise2" style={{ color: 'var(--brand)', fontSize: 'clamp(48px, 6.4vw, 80px)' }}>
          {T('قصص من الأرض.', 'Stories from the ground.')}
        </h1>
        <p className="lede rise3" style={{ maxWidth: 640 }}>
          {T('تقارير الموسم، وقصص الناس والأماكن، ودليل أول زيارة، ومطبخ كل مدينة. كل مقال بتاريخه واسم كاتبه.', 'Season reports, stories of people and places, first-visit notes and each city’s food. Every post is dated and signed.')}
        </p>
      </section>

      {top ? (
        <>
          <section className="wrap" style={{ paddingBlock: 24 }}>
            <Link className="feature" href={top.href}>
              <span className="art">
                <Photo media={top.media} shot={top.shot} size="hero" priority fallback={top.fallback} />
              </span>
              <span className="txt">
                <span className="eyebrow">
                  {T('مقال مميّز', 'Featured')} · {label(top)}
                </span>
                <span className="t">{top.title}</span>
                <span className="m">{meta(top)}</span>
                <span className="go">{T('اقرأ المقال ←', 'Read the post →')}</span>
              </span>
            </Link>
          </section>
          <section className="wrap" style={{ paddingBlock: '40px 88px' }}>
            <h2 className="sr-only">{T('كل المقالات', 'All posts')}</h2>
            {rest.length > 0 && (
              <Filterable
                label={T('تصنيفات المدونة', 'Blog categories')}
                all={T('الكل', 'All')}
                options={(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).filter((k) => rest.some((p) => p.tag === k)).map((k) => ({ value: k, label: CATEGORIES[k][locale] }))}
                className="cards c3 posts-grid"
                items={rest.map((p) => ({
                  key: p.key,
                  tags: [p.tag],
                  node: (
                    <Link className="pcard lift" href={p.href}>
                      <span className="media" style={{ height: 210 }}>
                        <Photo media={p.media} shot={p.shot} fallback={p.fallback} />
                      </span>
                      <span className="body">
                        <span className="meta">{label(p)}</span>
                        <span className="title">{p.title}</span>
                        <span style={{ fontSize: 14, color: 'var(--ink2)' }}>{meta(p)}</span>
                      </span>
                    </Link>
                  ),
                }))}
              />
            )}
          </section>
        </>
      ) : (
        <section className="wrap" style={{ paddingBlock: '24px 88px' }}>
          <p className="empty">{T('لا مقالات منشورة بعد.', 'No posts published yet.')}</p>
        </section>
      )}
    </Page>
  )
}
