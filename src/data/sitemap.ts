import { cache } from 'react'
import { GUIDE, STORIES } from '@/content/guide'
import { staticPhoto } from '@/content/photos'
import type { Media } from '@/payload-types'
import { buildWithoutDatabase } from '@/lib/build-phase'
import { isTranslated } from '@/lib/localized'
import { tripPath, tripPhotoKeys } from '@/lib/rural'
import { latest, type SitemapSnapshot, type SnapChild } from '@/lib/sitemap'
import { payloadClient } from '@/data/queries'

// Everything the sitemap needs, in one query per collection (never one per page). Every query runs
// as an anonymous visitor, like the pages: drafts and unapproved photos never reach the sitemap.

type Rel = number | { id: number } | null | undefined
const relId = (r: Rel): number | null => (r == null ? null : typeof r === 'number' ? r : r.id)

/**
 * Only the site's own photos (its /guide files and its Blob store) go in the image sitemap; Commons and
 * Flickr pictures are other people's work, credited on the page, and indexed on their own sites.
 */
export const isOwnImage = (src: string) => src.startsWith('/') || /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(src)

const guidePhotos = (keys: readonly string[]) => keys.flatMap((k) => staticPhoto(k)?.src ?? []).filter(isOwnImage)

const EMPTY: SitemapSnapshot = { cities: [], children: [], trips: [], reports: [], firstVisit: [], stories: [], guides: [], videos: [] }

type Collection = 'cities' | 'places' | 'stays' | 'venues' | 'cityLore' | 'cityPhotos' | 'statusItems' | 'dayTrips' | 'seasonReports' | 'firstVisitPages' | 'stories' | 'guides' | 'videos' | 'media'

export const getSitemapSnapshot = cache(async (): Promise<SitemapSnapshot> => {
  if (buildWithoutDatabase()) return EMPTY
  const p = await payloadClient()
  const all = async <T,>(collection: Collection, select: Record<string, true> | null, where?: object): Promise<T[]> =>
    (await p.find({ collection, overrideAccess: false, locale: 'all', depth: 0, pagination: false, ...(select ? { select } : {}), ...(where ? { where } : {}) } as never)).docs as T[]

  type Row = { id: number; city?: Rel; updatedAt?: string; image?: Rel; photo?: Rel; verifiedAt?: string | null }
  const [cities, places, stays, venues, lore, photos, status, trips, reports, firstVisit, stories, guides, videos] = await Promise.all([
    all<{ id: number; slug: string; parentCity?: Rel; updatedAt?: string; name?: unknown; lede?: unknown; coverImage?: Rel }>('cities', { slug: true, parentCity: true, updatedAt: true, name: true, lede: true, coverImage: true }),
    all<Row>('places', { city: true, updatedAt: true, image: true }),
    all<Row>('stays', { city: true, updatedAt: true, image: true }),
    all<Row>('venues', { city: true, updatedAt: true, image: true }),
    all<Row>('cityLore', { city: true, updatedAt: true }),
    all<Row>('cityPhotos', { city: true, updatedAt: true, photo: true }),
    all<Row>('statusItems', { city: true, updatedAt: true, verifiedAt: true }),
    all<{ id: number; slug?: string | null; title: string; fromCity?: Rel; place?: Rel; updatedAt?: string; checkedAt?: string | null; spots?: { image?: Rel }[] | null }>('dayTrips', {
      slug: true,
      title: true,
      fromCity: true,
      place: true,
      updatedAt: true,
      checkedAt: true,
      spots: true,
    }),
    all<{ slug: string; updatedAt?: string; photos?: Rel[] | null }>('seasonReports', { slug: true, updatedAt: true, photos: true }),
    all<{ topic: string; updatedAt?: string; lastVerifiedAt?: string | null; title?: unknown; body?: unknown }>('firstVisitPages', { topic: true, updatedAt: true, lastVerifiedAt: true, title: true, body: true }),
    all<{ slug: string; updatedAt?: string; title?: unknown; body?: unknown; photos?: Rel[] | null }>('stories', { slug: true, updatedAt: true, title: true, body: true, photos: true }),
    all<{ slug: string; updatedAt?: string; bio?: unknown; photo?: Rel; city?: Rel }>('guides', { slug: true, updatedAt: true, bio: true, photo: true, city: true }),
    all<{ updatedAt?: string; city?: Rel }>('videos', { updatedAt: true, city: true }),
  ])

  // One media query for every photo referenced above; the visitor only gets approved photos.
  const mediaIds = [
    ...cities.map((c) => c.coverImage),
    ...[...places, ...stays, ...venues].map((r) => r.image),
    ...photos.map((r) => r.photo),
    ...trips.flatMap((t) => (t.spots ?? []).map((s) => s.image)),
    ...reports.flatMap((r) => r.photos ?? []),
    ...stories.flatMap((s) => s.photos ?? []),
    ...guides.map((g) => g.photo),
  ]
    .map(relId)
    .filter((id): id is number => id != null)
  const media = mediaIds.length ? await all<Pick<Media, 'id' | 'url'>>('media', null, { id: { in: [...new Set(mediaIds)] } }) : []
  const urlOf = new Map(media.flatMap((m) => (m.url ? [[m.id, m.url] as const] : [])))
  const img = (r: Rel) => {
    const id = relId(r)
    return id == null ? null : (urlOf.get(id) ?? null)
  }
  const imgs = (rs: readonly Rel[]) => rs.map(img).filter((u): u is string => Boolean(u))

  const slugOf = new Map(cities.map((c) => [c.id, c.slug]))
  const child = (rows: Row[], at: (r: Row) => string | undefined = (r) => r.updatedAt): SnapChild[] =>
    rows.flatMap((r) => {
      const city = relId(r.city)
      return city == null ? [] : [{ city, at: at(r), image: img(r.image ?? r.photo) }]
    })

  const dbStories = stories.map((s) => ({ slug: s.slug, at: s.updatedAt, translated: isTranslated([s.title, s.body], 'en'), images: imgs(s.photos ?? []) }))

  return {
    cities: cities.map((c) => ({
      id: c.id,
      slug: c.slug,
      parentCity: relId(c.parentCity),
      updatedAt: c.updatedAt,
      translated: isTranslated([c.name, c.lede], 'en'),
      images: [...imgs([c.coverImage]), ...guidePhotos(GUIDE[c.slug]?.gallery ?? [])],
    })),
    children: [
      ...child(places),
      ...child(stays),
      ...child(venues),
      ...child(lore),
      ...child(photos),
      // A status item counts when it was last verified, even if nothing else in it changed.
      ...child(status, (r) => latest(r.updatedAt, r.verifiedAt)),
      // City pages list their guides and videos too (batch 4).
      ...guides.flatMap((g) => (relId(g.city) == null ? [] : [{ city: relId(g.city)!, at: g.updatedAt }])),
      ...videos.flatMap((v) => (relId(v.city) == null ? [] : [{ city: relId(v.city)!, at: v.updatedAt }])),
    ],
    trips: trips.map((t) => {
      const place = relId(t.place)
      const placeSlug = place == null ? undefined : slugOf.get(place)
      const gallery = placeSlug && GUIDE[placeSlug]?.gallery.length ? GUIDE[placeSlug].gallery : tripPhotoKeys(t)
      return {
        path: tripPath(t),
        fromCity: relId(t.fromCity),
        place,
        at: latest(t.updatedAt, t.checkedAt),
        images: [...imgs((t.spots ?? []).map((s) => s.image)), ...guidePhotos(gallery)],
      }
    }),
    reports: reports.map((r) => ({ slug: r.slug, at: r.updatedAt, images: imgs(r.photos ?? []) })),
    firstVisit: firstVisit.map((f) => ({ topic: f.topic, at: latest(f.updatedAt, f.lastVerifiedAt), translated: isTranslated([f.title, f.body], 'en') })),
    // The starter guide's photo essays, unless the CMS has a story with the same slug (blog/[slug]).
    stories: [
      ...dbStories,
      ...STORIES.filter((g) => !dbStories.some((s) => s.slug === g.slug)).map((g) => ({ slug: g.slug, at: g.date, translated: true, images: guidePhotos(g.photos) })),
    ],
    guides: guides.map((g) => ({ slug: g.slug, at: g.updatedAt, translated: isTranslated([g.bio], 'en'), images: imgs([g.photo]) })),
    videos: videos.map((v) => ({ at: v.updatedAt })),
  }
})
