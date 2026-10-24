import manifest from './photos.json'

/** A guide photo in public/guide: the owner's own collection or a free-licensed Wikimedia Commons file. */
export type StaticPhoto = { src: string; w: number; h: number; credit: string; href: string | null }

const PHOTOS = manifest as Record<string, StaticPhoto>

export const staticPhoto = (key: string | undefined): StaticPhoto | null => (key ? (PHOTOS[key] ?? null) : null)
