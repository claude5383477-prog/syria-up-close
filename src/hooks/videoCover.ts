import type { CollectionBeforeChangeHook } from 'payload'
import { PLATFORM_LABELS, type Platform } from '@/lib/video'
import { fetchCover, type Fetcher } from '@/lib/videoCover'
import { storedPhotoName } from '@/lib/stored-name'

const idOf = (v: unknown) => (v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v)

/**
 * Videos beforeChange, after videoFromUrl: an Instagram or TikTok video with no still gets its cover
 * from the platform, stored in media and credited to the creator. Re-saving a video without a still
 * tries again. Saving never fails over it: with no cover the card shows without a picture, as before.
 */
export const videoCover =
  (fetcher?: Fetcher): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req }) => {
    const d = data as Record<string, unknown>
    const o = (originalDoc ?? {}) as Record<string, unknown>
    const platform = (d.platform ?? o.platform) as Platform | undefined
    const id = (d.videoId ?? o.videoId) as string | undefined
    const url = (d.url ?? o.url) as string | undefined
    const urlChanged = d.url !== undefined && d.url !== o.url
    const hasStill = idOf('thumbnail' in d ? d.thumbnail : o.thumbnail) != null
    if ((platform !== 'instagram' && platform !== 'tiktok') || !id || !url || (hasStill && !urlChanged)) return d
    try {
      const cover = await fetchCover({ platform, id, url }, fetcher)
      if (!cover) return d
      const title = typeof (d.title ?? o.title) === 'string' ? String(d.title ?? o.title) : ''
      const author = String(d.author ?? o.author ?? '')
      const name = storedPhotoName(`video-${platform}-${id}.${cover.mimetype.split('/')[1]}`)
      // overrideAccess: server-chosen file name; the outer request's body (a video url) is not an upload.
      const media = await req.payload.create({
        collection: 'media',
        data: { alt: title || `${PLATFORM_LABELS[platform].ar}: ${author}`, credit: `${author} · ${PLATFORM_LABELS[platform].en}` } as never,
        file: { data: cover.data, mimetype: cover.mimetype, name, size: cover.data.length },
        overrideAccess: true,
        req,
      })
      return { ...d, thumbnail: media.id }
    } catch (err) {
      req.payload.logger.warn({ msg: 'videoCover: no cover', err })
      return d
    }
  }
