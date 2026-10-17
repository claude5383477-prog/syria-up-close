import { Page } from '@/components/Header'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Crumbs, Loc, text } from '@/components/content'
import { Stamp } from '@/components/Stamp'
import { getFirstVisitPage, getSettings } from '@/data/queries'
import { FIRST_VISIT } from '@/lib/firstVisitTopics'
import { isLocale, type Locale } from '@/lib/i18n'
import { isTranslated, pick } from '@/lib/localized'
import { localePath } from '@/lib/routing'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string; topic: string }> }

export function generateStaticParams() {
  return FIRST_VISIT.map((f) => ({ topic: f.topic }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, topic } = await params
  const page = isLocale(locale) ? await getFirstVisitPage(topic) : null
  if (!page || !isLocale(locale)) return {}
  return {
    title: text(page.title, locale) ?? topic,
    description: text(page.summary, locale) ?? undefined,
    robots: isTranslated([page.title, page.body], locale) ? undefined : { index: false, follow: true },
  }
}

export default async function FirstVisitTopicPage({ params }: Props) {
  const { locale: l, topic } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const page = await getFirstVisitPage(topic) // published only (ق: no source, no publish)
  if (!page) notFound()
  const settings = await getSettings()
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const body = pick<SerializedEditorState>(page.body, locale)

  return (
    <Page locale={locale} path={`/outside/first-visit/${topic}`}>
    <article className="s">
      <div className="wrap stack">
        <Crumbs
          items={[
            { href: localePath(locale, '/outside'), label: T('جاي من برّا', 'Coming from abroad') },
            { href: localePath(locale, '/outside/first-visit'), label: T('أول زيارة', 'First visit') },
            { label: <Loc v={page.title} locale={locale} /> },
          ]}
        />
        <h1>
          <Loc v={page.title} locale={locale} />
        </h1>
        <div className="chips" style={{ alignItems: 'center' }}>
          <Stamp verifiedAt={page.lastVerifiedAt ?? null} maxAgeDays={settings.staleness?.firstVisitDays ?? 30} locale={locale} />
          {page.lastVerifiedByName && (
            <span className="cap">
              {T('تحقق منها: ', 'Checked by: ')}
              {page.lastVerifiedByName}
            </span>
          )}
        </div>
        {text(page.summary, locale) && (
          <p style={{ color: 'var(--ink2)', fontSize: 18 }}>
            <Loc v={page.summary} locale={locale} />
          </p>
        )}
        {body && (
          <div className="prose" {...(body.lang !== locale ? { lang: 'ar', dir: 'rtl' } : {})}>
            <RichText data={body.value} />
          </div>
        )}
        {page.officialSourceUrl && (
          <p className="note" style={{ maxWidth: 'none' }}>
            {T('المصدر الرسمي: ', 'Official source: ')}
            <a href={page.officialSourceUrl} rel="noopener" target="_blank">
              {new URL(page.officialSourceUrl).hostname}
            </a>
          </p>
        )}
      </div>
    </article>
    </Page>
  )
}
