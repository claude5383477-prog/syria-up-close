import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Page } from '@/components/Header'
import { Loc, Photo, SectionHead, text } from '@/components/content'
import { Filterable } from '@/components/client/Filterable'
import { formatDate } from '@/components/Stamp'
import { asDoc, asMedia, getLatestReports, getStories } from '@/data/queries'
import { isLocale, type Locale } from '@/lib/i18n'
import { localePath } from '@/lib/routing'
import { pageMetadata } from '@/lib/seo'

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
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Page locale={locale} path="/blog">
      <section className="s">
        <div className="wrap stack" style={{ gap: 12 }}>
          <span className="kicker">{T('المدونة', 'Blog')}</span>
          <h1 className="display">{T('قصص من الأرض.', 'Stories from the ground.')}</h1>
          <p style={{ color: 'var(--ink2)', fontSize: 18 }}>
            {T('تقارير الموسم، وقصص الناس والأماكن، ودليل أول زيارة، ومطبخ كل مدينة. كل مقال بتاريخه واسم كاتبه.', 'Season reports, stories of people and places, first-visit notes and each city’s food. Every post is dated and signed.')}
          </p>
        </div>
      </section>
      <section className="s">
        <div className="wrap">
          <SectionHead title={T('كل المقالات', 'All posts')} />
          {posts.length ? (
            <Filterable
              label={T('التصنيف', 'Category')}
              all={T('الكل', 'All')}
              options={(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).filter((k) => posts.some((p) => p.tag === k)).map((k) => ({ value: k, label: CATEGORIES[k][locale] }))}
              className="posts"
              items={posts.map((p) => ({
                key: p.key,
                tags: [p.tag],
                node: (
                  <Link className="post" href={p.href}>
                    <Photo media={p.media} shot={p.shot} />
                    <small>
                      {CATEGORIES[p.tag as keyof typeof CATEGORIES]?.[locale]}
                      {p.city && (
                        <>
                          {' · '}
                          <Loc v={p.city.name} locale={locale} />
                        </>
                      )}
                    </small>
                    <b>{p.title}</b>
                    {p.date && <span>{formatDate(new Date(p.date), locale)}</span>}
                  </Link>
                ),
              }))}
            />
          ) : (
            <p className="empty">{T('لا مقالات منشورة بعد.', 'No posts published yet.')}</p>
          )}
        </div>
      </section>
    </Page>
  )
}
