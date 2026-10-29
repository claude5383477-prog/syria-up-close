import type { VideoDoc } from '@/data/queries'
import { asMedia } from '@/lib/docs'
import type { Locale } from '@/lib/i18n'
import { text } from '@/lib/localized'
import { PLATFORM_LABELS, autoThumbnail, parseVideoUrl, type Orientation, type Platform } from '@/lib/video'

export type VideoCard = { id: number; platform: Platform; videoId: string; orientation: Orientation; title: string; author: string; duration?: string | null; thumbnail?: string | null }

/** Published videos as cards; a row whose link no longer parses is skipped rather than shown broken. */
export function videoCards(docs: VideoDoc[], locale: Locale): VideoCard[] {
  return docs.flatMap((d) => {
    const p = d.platform && d.videoId ? { platform: d.platform, id: d.videoId, orientation: d.orientation ?? (d.platform === 'youtube' ? 'wide' : 'tall') } : parseVideoUrl(d.url)
    if (!p) return []
    const m = asMedia(d.thumbnail ?? null)
    return [
      {
        id: d.id,
        platform: p.platform,
        videoId: p.id,
        orientation: p.orientation,
        title: text(d.title, locale) ?? text(d.title, 'ar') ?? '',
        author: d.author,
        duration: d.duration,
        thumbnail: m?.sizes?.card?.url ?? m?.url ?? autoThumbnail(p),
      },
    ]
  })
}

/** Labels shared by /videos and the city pages' video section. */
export function videoText(locale: Locale) {
  const T = (ar: string, en: string) => (locale === 'ar' ? ar : en)
  return {
    all: T('الكل', 'All'),
    platforms: { youtube: PLATFORM_LABELS.youtube[locale], instagram: PLATFORM_LABELS.instagram[locale], tiktok: PLATFORM_LABELS.tiktok[locale] },
    tabs: T('المنصة', 'Platform'),
    play: T('شغّل', 'Play'),
    share: T('شارك', 'Share'),
    on: T('على {p} ↗', 'On {p} ↗'),
    close: T('إغلاق', 'Close'),
    copied: T('انسخ رابط المقطع.', 'Video link copied.'),
    link: T('الرابط:', 'Link:'),
  }
}
