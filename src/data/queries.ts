import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import { cache } from 'react'
import type { Media } from '@/payload-types'
import type { Rel } from '@/lib/docs'
import { buildWithoutDatabase } from '@/lib/build-phase'
import { timed } from '@/lib/timing'

export { asDoc, asMedia, damascusDate } from '@/lib/docs'

// Public page data. Every query runs as an anonymous visitor (overrideAccess: false, no user), so
// drafts and private collections can never reach a page. Localized fields come back as { ar, en }
// (locale: 'all'); pages resolve them with lib/localized.pick().

export const payloadClient = cache(() => timed('getPayload', () => getPayload({ config })))

/** A localized field fetched with locale 'all' (or a plain value for non-localized fields). */
export type L = unknown

export type CityDoc = { id: number; slug: string; updatedAt?: string; name: L; tag: L; lede: L; eat: L; coverShotNote: L; coverImage?: Rel<Media>; parentCity?: Rel<CityDoc> | null }
export type PlaceDoc = { id: number; title: L; description: L; image?: Rel<Media>; order?: number | null; lat?: number | null; lng?: number | null }
export type StatusDoc = {
  id: number
  type: 'electricity' | 'internet' | 'roads' | 'weather' | 'events'
  value: L
  sourceUrl?: string | null
  verifiedByName?: string | null
  verifiedAt?: string | null
}
export type StayDoc = { id: number; title: L; description: L; image?: Rel<Media>; ahleenUrl?: string | null; city?: Rel<CityDoc>; lat?: number | null; lng?: number | null }
export type VenueDoc = { id: number; kind: 'restaurant' | 'cafe' | 'sweets' | 'park'; name: L; neighbourhood?: L; note?: L; image?: Rel<Media>; lat?: number | null; lng?: number | null }
export type LoreDoc = { id: number; kind: 'secret' | 'joke' | 'proverb'; text: string; meaning?: string | null; tellerName: string }
export type CityPhotoDoc = { id: number; photo: Rel<Media>; caption?: L; credit?: string | null; shotDate?: string | null }
export type StoryDoc = {
  id: number
  slug: string
  updatedAt?: string
  title: L
  body?: L
  category?: 'story' | 'food' | 'firstVisit' | 'trails' | null
  publishedAt?: string | null
  photos?: Rel<Media>[] | null
  city?: Rel<CityDoc>
}
export type SettingsDoc = {
  ahleenBaseUrl: string
  partnerLinkRel: string
  disclosureText: L
  socialProfiles?: { url: string }[] | null
  staleness?: { statusDays?: number | null; firstVisitDays?: number | null } | null
}
export type TripSpot = { id?: string | null; kind: 'stay' | 'food' | 'nature' | 'ruins' | 'picnic'; name: string; note?: string | null; lat?: number | null; lng?: number | null; image?: Rel<Media> }
export type DayTripDoc = {
  id: number
  title: string
  description?: string | null
  fromCity: Rel<CityDoc>
  slug?: string | null
  tag?: string | null
  place?: Rel<CityDoc> | null
  lat?: number | null
  lng?: number | null
  distanceNote?: string | null
  checkedAt?: string | null
  sources?: string | null
  spots?: TripSpot[] | null
  updatedAt?: string
}
export type ReportDoc = {
  id: number
  slug: string
  updatedAt?: string
  title: string
  body?: unknown
  fieldDate: string
  authorName?: string | null
  photos?: Rel<Media>[] | null
  city: Rel<CityDoc>
}
export type FirstVisitDoc = {
  id: number
  updatedAt?: string
  topic: 'visa' | 'arrival' | 'money' | 'connectivity' | 'transport'
  title: L
  summary: L
  body: L
  officialSourceUrl?: string | null
  lastVerifiedAt?: string | null
  lastVerifiedByName?: string | null
}
export type DailyDetailDoc = { id: number; date: string; sentence: L; place: L; photo?: Rel<Media>; city?: Rel<CityDoc> }

const pub = { overrideAccess: false, locale: 'all' } as const

// Docker image build (lib/build-phase): no database, so pages prerender empty and are refreshed on boot.
const noDatabase = buildWithoutDatabase()
const BUILD_SETTINGS: SettingsDoc = { ahleenBaseUrl: '', partnerLinkRel: '', disclosureText: null, staleness: null }

async function find<T>(collection: Parameters<Awaited<ReturnType<typeof payloadClient>>['find']>[0]['collection'], opts: { where?: Where; sort?: string; limit?: number; depth?: number }): Promise<T[]> {
  if (noDatabase) return []
  const p = await payloadClient()
  const res = await timed(`find ${collection}`, () =>
    p.find({ collection, ...pub, depth: opts.depth ?? 1, limit: opts.limit ?? 100, where: opts.where, sort: opts.sort } as never),
  )
  return res.docs as unknown as T[]
}

export const getCities = cache(() => find<CityDoc>('cities', { sort: 'id' }))

/** Main cities only (no parent city): lists, the home map, the city picker. */
export const getMainCities = cache(async () => (await getCities()).filter((c) => c.parentCity == null))

export const getCity = cache(async (slug: string) => (await find<CityDoc>('cities', { where: { slug: { equals: slug } }, limit: 1 }))[0] ?? null)

/** Every place on the site, for the search box (depth 0: the city comes back as its id). */
export const getAllPlaces = cache(() => find<PlaceDoc & { city: number | CityDoc }>('places', { sort: 'order', limit: 1000, depth: 0 }))

export const getPlaces = cache((cityId: number) => find<PlaceDoc>('places', { where: { city: { equals: cityId } }, sort: 'order' }))

export const getStatusItems = cache((cityId: number) => find<StatusDoc>('statusItems', { where: { city: { equals: cityId } }, depth: 0 }))

export const getStays = cache((cityId: number) => find<StayDoc>('stays', { where: { city: { equals: cityId } } }))

export const getSettings = cache(async (): Promise<SettingsDoc> => {
  if (noDatabase) return BUILD_SETTINGS
  const p = await payloadClient()
  return (await timed('findGlobal siteSettings', () => p.findGlobal({ slug: 'siteSettings', ...pub, depth: 0 }))) as unknown as SettingsDoc
})

export const getDayTrips = cache(() => find<DayTripDoc>('dayTrips', { sort: 'order' }))

/** One trip page, by slug or (for a trip saved without one) by id. */
export const getTrip = cache(async (key: { slug: string } | { id: number }) => {
  const where: Where = 'slug' in key ? { slug: { equals: key.slug } } : { id: { equals: key.id } }
  return (await find<DayTripDoc>('dayTrips', { where, limit: 1, depth: 1 }))[0] ?? null
})

/** The trip whose page replaced a resort's city page (Bloudan, Palmyra…). */
export const getTripForPlace = cache(async (cityId: number) => (await find<DayTripDoc>('dayTrips', { where: { place: { equals: cityId } }, limit: 1, depth: 0 }))[0] ?? null)

export const getLatestReports = cache((limit = 3) => find<ReportDoc>('seasonReports', { sort: '-fieldDate', limit }))

export const getReport = cache(async (slug: string) => (await find<ReportDoc>('seasonReports', { where: { slug: { equals: slug } }, limit: 1 }))[0] ?? null)

export const getFirstVisitPages = cache(() => find<FirstVisitDoc>('firstVisitPages', { depth: 0 }))

export const getFirstVisitPage = cache(
  async (topic: string) => (await find<FirstVisitDoc>('firstVisitPages', { where: { topic: { equals: topic } }, depth: 0, limit: 1 }))[0] ?? null,
)

/** Latest daily detail dated today or earlier (Damascus time). */
export const getDailyDetail = cache(async (today: string) => {
  const docs = await find<DailyDetailDoc>('dailyDetail', { where: { date: { less_than_equal: `${today}T23:59:59.999Z` } }, sort: '-date', limit: 1 })
  return docs[0] ?? null
})

/** Every stay on the site, for the hotels section of /outside. */
export const getAllStays = cache(() => find<StayDoc>('stays', { sort: 'id', limit: 200 }))

/** Published restaurants, cafes, sweet shops and parks of a city. */
export const getVenues = cache((cityId: number) => find<VenueDoc>('venues', { where: { city: { equals: cityId } }, sort: 'order', depth: 1 }))

/** Published secrets, jokes and proverbs of a city (Arabic only). */
export const getCityLore = cache((cityId: number) => find<LoreDoc>('cityLore', { where: { city: { equals: cityId } }, sort: 'order', depth: 0 }))

/** A city's photo gallery, newest shot first. */
export const getCityPhotos = cache((cityId: number) => find<CityPhotoDoc>('cityPhotos', { where: { city: { equals: cityId } }, sort: '-shotDate', limit: 24 }))

/** Published blog posts, newest first. */
export const getStories = cache((limit = 30) => find<StoryDoc>('stories', { sort: '-publishedAt', limit }))

export const getStory = cache(async (slug: string) => (await find<StoryDoc>('stories', { where: { slug: { equals: slug } }, limit: 1 }))[0] ?? null)
