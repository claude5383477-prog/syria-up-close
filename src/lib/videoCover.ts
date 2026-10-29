import type { Platform } from '@/lib/video'
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits'

// Instagram and TikTok publish no fixed still like YouTube, and their cover links expire within days,
// so the cover is fetched once on save and stored in our media library (owner request 2026-10-29).

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>
export type Cover = { data: Buffer; mimetype: string }

const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; SyriaUpClose/1.0; +https://www.upclosesyria.com)' }

/** The <img class="EmbeddedMediaImage" src="…"> of Instagram's embed page, whatever the attribute order. */
export function instagramCoverUrl(html: string): string | null {
  const tag = /<img[^>]*class="[^"]*EmbeddedMediaImage[^"]*"[^>]*>/.exec(html)?.[0]
  const src = tag && /\ssrc="([^"]+)"/.exec(tag)?.[1]
  return src ? src.replace(/&amp;/g, '&') : null
}

/** Where the platform keeps this video's cover right now (the link expires; download it at once). */
export async function coverUrl(v: { platform: Platform; id: string; url: string }, fetcher: Fetcher = fetch): Promise<string | null> {
  if (v.platform === 'tiktok') {
    const res = await fetcher(`https://www.tiktok.com/oembed?url=${encodeURIComponent(v.url)}`, { headers: UA })
    if (!res.ok) return null
    const j = (await res.json()) as { thumbnail_url?: unknown }
    return typeof j.thumbnail_url === 'string' ? j.thumbnail_url : null
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
