import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import { cache } from 'react'
import type { Media } from '@/payload-types'
import type { Rel } from '@/lib/docs'

export { asDoc, asMedia, damascusDate } from '@/lib/docs'

// Public page data. Every query runs as an anonymous visitor (overrideAccess: false, no user), so
// drafts and private collections can never reach a page. Localized fields come back as { ar, en }
// (locale: 'all'); pages resolve them with lib/localized.pick().

export const payloadClient = cache(() => getPayload({ config }))

/** A localized field fetched with locale 'all' (or a plain value for non-localized fields). */
export type L = unknown

export type CityDoc = { id: number; slug: string; name: L; tag: L; lede: L; eat: L; coverShotNote: L; coverImage?: Rel<Media> }
export type PlaceDoc = { id: number; title: L; description: L; image?: Rel<Media>; order?: number | null }
export type StatusDoc = {
  id: number
  type: 'electricity' | 'internet' | 'roads' | 'weather' | 'events'
  value: L
  sourceUrl?: string | null
  verifiedByName?: string | null
  verifiedAt?: string | null
}
export type StayDoc = { id: number; title: L; description: L; image?: Rel<Media>; ahleenUrl: string }
export type SettingsDoc = {
  ahleenBaseUrl: string
  partnerLinkRel: string
  disclosureText: L
  staleness?: { statusDays?: number | null; firstVisitDays?: number | null } | null
}
export type DayTripDoc = { id: number; title: string; description?: string | null; fromCity: Rel<CityDoc> }
export type ReportDoc = {
  id: number
  slug: string
  title: string
  body?: unknown
  fieldDate: string
  authorName?: string | null
  photos?: Rel<Media>[] | null
  city: Rel<CityDoc>
}
export type FirstVisitDoc = {
  id: number
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

async function find<T>(collection: Parameters<Awaited<ReturnType<typeof payloadClient>>['find']>[0]['collection'], opts: { where?: Where; sort?: string; limit?: number; depth?: number }): Promise<T[]> {
  const p = await payloadClient()
  const res = await p.find({ collection, ...pub, depth: opts.depth ?? 1, limit: opts.limit ?? 100, where: opts.where, sort: opts.sort } as never)
  return res.docs as unknown as T[]
}

export const getCities = cache(() => find<CityDoc>('cities', { sort: 'id' }))

export const getCity = cache(async (slug: string) => (await find<CityDoc>('cities', { where: { slug: { equals: slug } }, limit: 1 }))[0] ?? null)

export const getPlaces = cache((cityId: number) => find<PlaceDoc>('places', { where: { city: { equals: cityId } }, sort: 'order' }))

export const getStatusItems = cache((cityId: number) => find<StatusDoc>('statusItems', { where: { city: { equals: cityId } }, depth: 0 }))

export const getStays = cache((cityId: number) => find<StayDoc>('stays', { where: { city: { equals: cityId } } }))

export const getSettings = cache(async (): Promise<SettingsDoc> => {
  const p = await payloadClient()
  return (await p.findGlobal({ slug: 'siteSettings', ...pub, depth: 0 })) as unknown as SettingsDoc
})

export const getDayTrips = cache(() => find<DayTripDoc>('dayTrips', { sort: 'order' }))

export const getLatestReports = cache((limit = 3) => find<ReportDoc>('seasonReports', { sort: '-fieldDate', limit }))

export const getReport = cache(async (slug: string) => (await find<ReportDoc>('seasonReports', { where: { slug: { equals: slug } }, limit: 1 }))[0] ?? null)

export const getFirstVisitPages = cache(() => find<FirstVisitDoc>('firstVisitPages', { depth: 0 }))

/** Latest daily detail dated today or earlier (Damascus time). */
export const getDailyDetail = cache(async (today: string) => {
  const docs = await find<DailyDetailDoc>('dailyDetail', { where: { date: { less_than_equal: `${today}T23:59:59.999Z` } }, sort: '-date', limit: 1 })
  return docs[0] ?? null
})
