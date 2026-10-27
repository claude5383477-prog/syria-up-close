import manifest from './photos.json'

/**
 * A guide photo: the owner's own collection (public/guide or Blob) or a free-licensed file from
 * Wikimedia Commons / Flickr loaded straight from its host. `full` is the larger size for the
 * lightbox, `year` the year it was taken when the source says so (older shots are marked archival).
 */
export type StaticPhoto = { src: string; w: number; h: number; credit: string; href: string | null; full?: string; year?: number | null }

const PHOTOS = manifest as Record<string, StaticPhoto>

export const staticPhoto = (key: string | undefined): StaticPhoto | null => (key ? (PHOTOS[key] ?? null) : null)

/** Photos taken before this year are labelled archival: the site shows Syria as it is today. */
export const ARCHIVE_BEFORE = 2015

/** "صورة أرشيفية · 2009" for an old photo, null otherwise. */
export function archiveLabel(p: Pick<StaticPhoto, 'year'> | null | undefined, locale: 'ar' | 'en'): string | null {
  if (!p?.year || p.year >= ARCHIVE_BEFORE) return null
  return locale === 'ar' ? `صورة أرشيفية · ${p.year}` : `Archive photo · ${p.year}`
}
