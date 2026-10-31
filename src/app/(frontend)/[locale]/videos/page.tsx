import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Page } from '@/components/Header'
import { JsonLd } from '@/components/content'
import { Ablaq, SyrianFill } from '@/components/Patterns'
import { VideoGallery } from '@/components/client/VideoGallery'
import { getVideos } from '@/data/queries'
import { isLocale, type Locale } from '@/lib/i18n'
import { siteBase, videoObjectsLd } from '@/lib/jsonld'
import { localePath } from '@/lib/routing'
import { pageMetadata } from '@/lib/seo'
import { describe, SITE_LINE } from '@/lib/seoText'
import { embedUrl, isoDuration, originalUrl, videoAnchor } from '@/lib/video'
import { videoCards, videoText } from '@/lib/videoCards'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const n = (await getVideos()).length
  return pageMetadata({
    locale,
    path: '/videos',
    title: T('عدسات: سوريا بعيون صنّاع المحتوى', 'Adasat: Syria through creators’ lenses'),
    description: describe([
      n > 0
        ? T('مقاطع مختارة عن سوريا من يوتيوب وإنستغرام وتيك توك، تشتغل هنا وتُنسب لأصحابها', 'Chosen videos about Syria from YouTube, Instagram and TikTok, played here and credited to their creators')
        : T('مقاطع عن سوريا من يوتيوب وإنستغرام وتيك توك، نضيفها هنا بعد موافقة صنّاعها وتُنسب لأصحابها', 'Videos about Syria from YouTube, Instagram and TikTok, added here once their creators agree, always credited'),
      SITE_LINE[locale],
    ]),
  })
}

export default async function VideosPage({ params }: Props) {
  const { locale: l } = await params
  if (!isLocale(l)) notFound()
  const locale: Locale = l
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  const docs = await getVideos()
  const cards = videoCards(docs, locale)
  const path = localePath(locale, '/videos')
  return (
    <Page locale={locale} path="/videos">
      {cards.length > 0 && (
        <JsonLd
          data={videoObjectsLd({
            base: siteBase(),
            path,
            videos: cards.map((v) => {
              const d = docs.find((x) => x.id === v.id)
              return {
                anchor: videoAnchor(v.id),
                name: v.title,
                author: v.author,
                thumbnail: v.thumbnail ?? undefined,
                embedUrl: embedUrl({ platform: v.platform, id: v.videoId }),
                contentUrl: originalUrl({ platform: v.platform, id: v.videoId }),
                uploadDate: d?.publishedOn ?? d?.updatedAt,
                duration: isoDuration(v.duration),
              }
            }),
          })}
        />
      )}
      <section className="dark band2 vid-hero">
        <SyrianFill id="vine" opacity={0.12} />
        <div className="wrap">
          <span className="eyebrow">{T('مقاطع مختارة من وسائل التواصل', 'Chosen from social media')}</span>
          <h1>
            <svg width="58" height="58" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="29" fill="none" stroke="#0B4836" strokeWidth="2" />
              <circle cx="32" cy="32" r="23.5" fill="none" stroke="#0B4836" strokeWidth="3.5" strokeDasharray="1.2 3.9" />
              <circle cx="32" cy="32" r="11" fill="none" stroke="#B5713A" strokeWidth="1.6" />
              <path d="M28 25v14l11-7z" fill="#B5713A" />
            </svg>
            {T('عدسات', 'Adasat')}
          </h1>
          <p className="lede">
            {T(
              'سوريا بعيون صنّاع المحتوى: أحلى المقاطع عن جمالها وأكلها وناسها. بتشتغل هون، بتنشارك، ومنحوّلك لصاحب المقطع الأصلي.',
              'Syria through creators’ lenses: videos of its beauty, food and people. They play here, you can share them, and every one links back to its creator.',
            )}
          </p>
        </div>
      </section>
      <Ablaq />
      <section className="sec">
        <div className="wrap">
          {cards.length ? (
            <VideoGallery videos={cards} text={videoText(locale)} pagePath={path} cardHeading="h2" />
          ) : (
            <div className="vgrid">
              {[0, 1, 2].map((i) => (
                <div key={i} className="vslot">
                  <b>{T('أول مقطع', 'The first video')}</b>
                  <span className="muted">{T('بانتظار إذن صاحبه: منضيف المقاطع بعد موافقة صنّاعها.', 'Awaiting its creator’s permission: videos go up once their makers agree.')}</span>
                </div>
              ))}
            </div>
          )}
          <p className="fine">
            {T(
              'كل مقطع عليه اسم صاحبه ورابط للأصل، ويشتغل بمشغّل المنصة نفسها. ما منزّل مقاطع ولا منعيد رفعها. المشغّل ما بيتحمّل قبل ما تضغط تشغيل.',
              'Every video carries its creator’s name and a link to the original, and plays in the platform’s own player. We never download or re-upload. No player loads until you press play.',
            )}
          </p>
        </div>
      </section>
    </Page>
  )
}
