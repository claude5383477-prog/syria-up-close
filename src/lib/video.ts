// "عدسات" (batch 4): the editor pastes a video link; the platform, the video id and the shape are read
// from it. Players are the platforms' own embeds, loaded only when the visitor presses play.

export const PLATFORMS = ['youtube', 'instagram', 'tiktok'] as const
export type Platform = (typeof PLATFORMS)[number]
export type Orientation = 'wide' | 'tall'
export type ParsedVideo = { platform: Platform; id: string; orientation: Orientation }

export const PLATFORM_LABELS: Record<Platform, { ar: string; en: string }> = {
  youtube: { ar: 'يوتيوب', en: 'YouTube' },
  instagram: { ar: 'إنستغرام', en: 'Instagram' },
  tiktok: { ar: 'تيك توك', en: 'TikTok' },
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/
const IG_ID = /^[A-Za-z0-9_-]{5,40}$/
const TT_ID = /^\d{8,25}$/

function url(raw: string): URL | null {
  const s = raw.trim()
  if (!s) return null
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null
  } catch {
    return null
  }
}

const host = (u: URL) => u.hostname.toLowerCase().replace(/^(www\.|m\.|mobile\.)/, '')
const parts = (u: URL) => u.pathname.split('/').filter(Boolean)

/** Every link shape a person copies from the apps or the browser; null when it is not one we can embed. */
export function parseVideoUrl(raw: unknown): ParsedVideo | null {
  if (typeof raw !== 'string') return null
  const u = url(raw)
  if (!u) return null
  const h = host(u)
  const p = parts(u)
  if (h === 'youtu.be') return YT_ID.test(p[0] ?? '') ? { platform: 'youtube', id: p[0]!, orientation: 'wide' } : null
  if (h === 'youtube.com' || h === 'youtube-nocookie.com' || h === 'music.youtube.com') {
    const v = u.searchParams.get('v')
    if (p[0] === 'watch' && v && YT_ID.test(v)) return { platform: 'youtube', id: v, orientation: 'wide' }
    if (p[0] === 'shorts' && YT_ID.test(p[1] ?? '')) return { platform: 'youtube', id: p[1]!, orientation: 'tall' }
    if ((p[0] === 'embed' || p[0] === 'live' || p[0] === 'v') && YT_ID.test(p[1] ?? '')) return { platform: 'youtube', id: p[1]!, orientation: 'wide' }
    return null
  }
  if (h === 'instagram.com' || h === 'instagr.am') {
    // /p/<code>, /reel/<code>, /reels/<code>, /tv/<code>, also behind a user name: /<user>/reel/<code>
    const i = p.findIndex((x) => ['p', 'reel', 'reels', 'tv'].includes(x))
    return i >= 0 && IG_ID.test(p[i + 1] ?? '') ? { platform: 'instagram', id: p[i + 1]!, orientation: 'tall' } : null
  }
  if (h === 'tiktok.com') {
    // /@user/video/<id>, /@user/photo/<id> is not a video; /embed/v2/<id>, /player/v1/<id>
    const i = p.indexOf('video')
    if (i >= 0 && TT_ID.test(p[i + 1] ?? '')) return { platform: 'tiktok', id: p[i + 1]!, orientation: 'tall' }
    const last = p.at(-1) ?? ''
    if ((p[0] === 'embed' || p[0] === 'player') && TT_ID.test(last)) return { platform: 'tiktok', id: last, orientation: 'tall' }
    return null
  }
  return null
}

/** Why a link was refused, in the editor's words. */
export function videoUrlError(raw: unknown): true | string {
  if (parseVideoUrl(raw)) return true
  if (typeof raw === 'string' && /(vm|vt)\.tiktok\.com/i.test(raw)) return 'هذا رابط تيك توك مختصر: افتحه بالمتصفح والصق الرابط الكامل (فيه /video/ ورقم المقطع).'
  return 'الصق رابط مقطع من يوتيوب أو إنستغرام أو تيك توك.'
}

/** The platform's own player. YouTube through youtube-nocookie (no cookies until play). */
export function embedUrl(v: { platform: Platform; id: string }): string {
  if (v.platform === 'youtube') return `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&playsinline=1`
  if (v.platform === 'instagram') return `https://www.instagram.com/p/${v.id}/embed/`
  return `https://www.tiktok.com/player/v1/${v.id}?autoplay=1&rel=0`
}

/** The original, for the "watch on <platform>" button. */
export function originalUrl(v: { platform: Platform; id: string }): string {
  if (v.platform === 'youtube') return `https://www.youtube.com/watch?v=${v.id}`
  if (v.platform === 'instagram') return `https://www.instagram.com/p/${v.id}/`
  return `https://www.tiktok.com/video/${v.id}`
}

/** YouTube publishes a still for every video at a fixed address; the others need an uploaded one. */
export function autoThumbnail(v: { platform: Platform; id: string }): string | null {
  return v.platform === 'youtube' ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : null
}

/** "18:24" or "1:02:03" (optional), for the card and VideoObject's ISO 8601 duration. */
export function isoDuration(d: string | null | undefined): string | undefined {
  const m = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/.exec((d ?? '').trim())
  if (!m) return undefined
  const [, h, min, s] = m
  return `PT${h ? `${Number(h)}H` : ''}${Number(min)}M${Number(s)}S`
}

/** The anchor that opens one video directly: /videos#v-<id>. */
export const videoAnchor = (id: string | number) => `v-${id}`

/** Frame sources allowed in the Content-Security-Policy: the three players only. */
export const PLAYER_ORIGINS = ['https://www.youtube-nocookie.com', 'https://www.instagram.com', 'https://www.tiktok.com'] as const
