import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Page } from '@/components/Header'
import { Crumbs, JsonLd, Loc, Photo, text } from '@/components/content'
import { formatDate } from '@/components/Stamp'
import { Chip } from '@/components/ui'
import { asDoc, asMedia, getStories, getStory } from '@/data/queries'
import { isLocale, type Locale } from '@/lib/i18n'
import { articleLd, siteBase } from '@/lib/jsonld'
import { isTranslated, pick } from '@/lib/localized'
import { localePath } from '@/lib/routing'
import { bodyExcerpt, pageMetadata } from '@/lib/seo'
import { STORIES, type GuideStory } from '@/content/guide'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const slugs = (await getStories(200)).map((s) => s.slug)
  return [...new Set([...slugs, ...STORIES.map((g) => g.slug)])].map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const story = await getStory(slug)
  const guide = STORIES.find((g) => g.slug === slug)
  if (!story && guide) return pageMetadata({ locale, path: `/blog/${slug}`, title: guide.title[locale], description: guide.body[0]?.[locale] })
  if (!story) return {}
  return pageMetadata({
    locale,
    path: `/blog/${slug}`,
    title: text(story.title, locale) ?? slug,
    description: bodyExcerpt(pick(story.body, locale)?.value),
    translated: isTranslated([story.title, story.body], 'en'),
  })
}

/** One blog post (a published story). Drafts are 404: the query runs as a visitor. */
export default async function StoryPage({ params }: Props) {
  const { locale: l, slug } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const story = await getStory(slug)
  if (!story) {
    const guide = STORIES.find((g) => g.slug === slug)
    if (!guide) notFound()
    return <GuideStoryPage story={guide} locale={locale} />
  }
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const city = asDoc(story.city)
  const photos = (story.photos ?? []).map(asMedia).filter((m) => m !== null)
  const body = pick<SerializedEditorState>(story.body, locale)
  const date = story.publishedAt ?? story.updatedAt

  return (
    <Page locale={locale} path={`/blog/${slug}`}>
      <JsonLd
        data={articleLd({
          base: siteBase(),
          path: localePath(locale, `/blog/${slug}`),
          headline: text(story.title, locale) ?? slug,
          fieldDate: date ?? new Date(0).toISOString(),
          updatedAt: story.updatedAt,
          image: photos[0]?.sizes?.hero?.url ?? photos[0]?.url ?? undefined,
        })}
      />
      <article className="s">
        <div className="wrap stack">
          <Crumbs items={[{ href: localePath(locale, '/blog'), label: T('المدونة', 'Blog') }, { label: <Loc v={story.title} locale={locale} /> }]} />
          <h1>
            <Loc v={story.title} locale={locale} />
          </h1>
          <div className="chips">
            {city && (
              <Chip kind="city">
                <Loc v={city.name} locale={locale} />
              </Chip>
            )}
            {date && (
              <span className="stamp">
                <time dateTime={date}>{formatDate(new Date(date), locale)}</time>
              </span>
            )}
          </div>
          {photos[0] && <Photo media={photos[0]} shot={text(story.title, locale) ?? ''} size="hero" priority />}
          {body && (
            <div className="prose" lang={body.lang} dir={body.lang === 'ar' ? 'rtl' : 'ltr'}>
              <RichText data={body.value} />
            </div>
          )}
          {photos.length > 1 && (
            <div className="grid g3">
              {photos.slice(1).map((m) => (
                <Photo key={m.id} media={m} shot={text(story.title, locale) ?? ''} />
              ))}
            </div>
          )}
        </div>
      </article>
    </Page>
  )
}

/** A photo essay from the site's own collection (content/guide), shown until an editor publishes the slug. */
function GuideStoryPage({ story, locale }: { story: GuideStory; locale: Locale }) {
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const title = story.title[locale]
  return (
    <Page locale={locale} path={`/blog/${story.slug}`}>
      <JsonLd data={articleLd({ base: siteBase(), path: localePath(locale, `/blog/${story.slug}`), headline: title, fieldDate: story.date, updatedAt: story.date })} />
      <article className="s">
        <div className="wrap stack">
          <Crumbs items={[{ href: localePath(locale, '/blog'), label: T('المدونة', 'Blog') }, { label: title }]} />
          <h1>{title}</h1>
          <div className="chips">
            <span className="stamp">
              <time dateTime={story.date}>{formatDate(new Date(story.date), locale)}</time>
            </span>
          </div>
          <Photo shot={title} size="hero" priority fallback={story.photos[0]} />
          <div className="prose">
            {story.body.map((b, i) => (
              <p key={i}>{b[locale]}</p>
            ))}
          </div>
          <div className="grid g3 essay">
            {story.photos.slice(1).map((key) => (
              <Photo key={key} shot={title} fallback={key} />
            ))}
          </div>
        </div>
      </article>
    </Page>
  )
}
