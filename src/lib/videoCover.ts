import type { Platform } from '@/lib/video'
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits'

// Instagram and TikTok publish no fixed still like YouTube, and their cover links expire within days,
// so the cover is fetched once on save and stored in our media library (owner request 2026-10-29).

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>
export type Cover = { data: Buffer; mimetype: string }

// TikTok serves the page data only to a browser-like agent.
const BROWSER = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36' }
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; SyriaUpClose/1.0; +https://www.upclosesyria.com)' }

/** The first "cover" in a TikTok video page's embedded JSON (\\u002F-escaped). */
export function tiktokCoverUrl(html: string): string | null {
  const raw = /"cover":"(https:[^"]+)"/.exec(html)?.[1]
  return raw ? raw.replace(/\\u002F/g, '/') : null
}

/** The <img class="EmbeddedMediaImage" src="…"> of Instagram's embed page, whatever the attribute order. */
export function instagramCoverUrl(html: string): string | null {
  const tag = /<img[^>]*class="[^"]*EmbeddedMediaImage[^"]*"[^>]*>/.exec(html)?.[0]
  const src = tag && /\ssrc="([^"]+)"/.exec(tag)?.[1]
  return src ? src.replace(/&amp;/g, '&') : null
}

/** Where the platform keeps this video's cover right now (the link expires; download it at once). */
export async function coverUrl(v: { platform: Platform; id: string; url: string }, fetcher: Fetcher = fetch): Promise<string | null> {
  if (v.platform === 'tiktok') {
    // TikTok's oEmbed stopped returning thumbnail_url (2026-10); the video page still names its cover.
    const res = await fetcher(v.url, { headers: BROWSER })
    return res.ok ? tiktokCoverUrl(await res.text()) : null
  }
  if (v.platform === 'instagram') {
    const res = await fetcher(`https://www.instagram.com/p/${v.id}/embed/`, { headers: UA })
    return res.ok ? instagramCoverUrl(await res.text()) : null
  }
  return null // YouTube: autoThumbnail
}

/** The cover image itself, or null when it is missing, not an image we accept, or too large. */
export async function fetchCover(v: { platform: Platform; id: string; url: string }, fetcher: Fetcher = fetch): Promise<Cover | null> {
  const src = await coverUrl(v, fetcher)
  if (!src) return null
  const res = await fetcher(src, { headers: UA })
  const mimetype = res.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
  if (!res.ok || !/^image\/(jpeg|png|webp)$/.test(mimetype)) return null
  const data = Buffer.from(await res.arrayBuffer())
  return data.length && data.length <= MAX_UPLOAD_BYTES ? { data, mimetype } : null
}
