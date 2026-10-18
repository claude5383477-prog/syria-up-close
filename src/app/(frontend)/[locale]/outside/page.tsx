import { pageMetadata } from '@/lib/seo'
import { Page } from '@/components/Header'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Loc, SectionHead } from '@/components/content'
import { ButtonLink, Card, Chip, SoonTag } from '@/components/ui'
import { getFirstVisitPages } from '@/data/queries'
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
  const published = new Map((await getFirstVisitPages()).map((p) => [p.topic, p]))
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
        <div className="wrap grid g2">
          <div className="card">
            <h3>
              {T('خطط رحلات جاهزة', 'Ready-made trip plans')}
              <SoonTag locale={locale} />
            </h3>
            <p>{T('خطط من 3 إلى 10 أيام، لكل ليلة إقامة مقترحة.', '3 to 10-day plans, with a suggested stay for each night.')}</p>
          </div>
          <div className="card">
            <h3>
              {T('اسأل ابن البلد', 'Ask a local')}
              <SoonTag locale={locale} />
            </h3>
            <p>{T('وجه محلي لكل مدينة يجيب أسئلتك بفيديو قصير كل أسبوع.', 'A local face for each city answers your questions in a short weekly video.')}</p>
          </div>
        </div>
      </section>
    </Page>
  )
}
