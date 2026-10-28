import { after } from 'next/server'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, Payload } from 'payload'
import { indexNowEnabled, indexNowKey, runIndexNow, type PageRef, type Query } from '@/lib/indexnow'
import { isTranslated } from '@/lib/localized'
import { tripPath } from '@/lib/rural'
import { siteUrl } from '@/lib/site-url'

// Tells IndexNow which public pages a save or delete changed (SEO day 3). The work runs with Next's
// after(): once the response is sent, kept alive on Vercel until it finishes, so saving is never slower
// and a failure never reaches the editor or correspondent. Production only (lib/indexnow).

type Doc = Record<string, unknown> & { id?: number | string }
type Rel = number | { id: number } | null | undefined
const relId = (r: unknown): number | null => (r == null ? null : typeof r === 'number' ? r : typeof r === 'object' && 'id' in r ? Number((r as { id: number }).id) : null)

const visitor = { overrideAccess: false, depth: 0, locale: 'all' } as const

/** A city's own page, or for a resort the trip page that replaced it. Hidden or missing: none. */
async function cityPages(payload: Payload, id: Rel): Promise<PageRef[]> {
  const cityId = relId(id)
  if (cityId == null) return []
  const res = await payload.find({ collection: 'cities', where: { id: { equals: cityId } }, limit: 1, ...visitor })
  const city = res.docs[0] as unknown as { slug: string; parentCity?: Rel; name?: unknown; lede?: unknown } | undefined
  if (!city) return []
  if (relId(city.parentCity) == null) return [{ path: `/cities/${city.slug}`, translated: isTranslated([city.name, city.lede], 'en') }]
  const trips = await payload.find({ collection: 'dayTrips', where: { place: { equals: cityId } }, pagination: false, ...visitor })
  return trips.docs.map((t) => ({ path: tripPath(t as unknown as { id: number; slug?: string | null }) }))
}

/** English is sent only when the published page is translated; a page no longer visible goes in Arabic only. */
async function translatedNow(payload: Payload, collection: 'firstVisitPages' | 'stories', id: Doc['id']): Promise<boolean> {
  if (id == null) return false
  const res = await payload.find({ collection, where: { id: { equals: id } }, limit: 1, ...visitor })
  const doc = res.docs[0] as unknown as { title?: unknown; body?: unknown } | undefined
  return doc ? isTranslated([doc.title, doc.body], 'en') : false
}

type Resolver = (payload: Payload, doc: Doc) => Promise<PageRef[]>

const byCity: Resolver = (payload, doc) => cityPages(payload, doc.city as Rel)

/** The public pages each collection appears on. Collections not listed (media, users, audit log) send nothing. */
export const PAGES: Record<string, Resolver> = {
  cities: async (payload, doc) => {
    const own = await cityPages(payload, doc.id as number)
    // Deleted (or hidden) main city: its old address, so engines learn it is gone.
    const gone = !own.length && doc.slug && relId(doc.parentCity) == null ? [{ path: `/cities/${String(doc.slug)}` }] : []
    return [...own, ...gone, { path: '/cities' }]
  },
  places: byCity,
  stays: byCity,
  venues: byCity,
  cityLore: byCity,
  cityPhotos: byCity,
  statusItems: byCity,
  dayTrips: async (payload, doc) => [
    { path: tripPath({ id: Number(doc.id), slug: doc.slug as string | null }) },
    { path: '/inside' },
    // The city page lists its countryside.
    ...(await cityPages(payload, doc.fromCity as Rel)),
  ],
  seasonReports: async (_payload, doc) => [...(doc.slug ? [{ path: `/seasons/${String(doc.slug)}` }] : []), { path: '/seasons' }, { path: '/' }],
  firstVisitPages: async (payload, doc) => [
    { path: `/outside/first-visit/${String(doc.topic)}`, translated: await translatedNow(payload, 'firstVisitPages', doc.id) },
    { path: '/outside/first-visit' },
  ],
  stories: async (payload, doc) => [
    ...(doc.slug ? [{ path: `/blog/${String(doc.slug)}`, translated: await translatedNow(payload, 'stories', doc.id) }] : []),
    { path: '/blog' },
    { path: '/' },
  ],
  dailyDetail: async () => [{ path: '/' }],
}

/** Sends in the background of the current request; outside one (seed, migrations, tests) there is nothing to do. */
export function queueIndexNow(payload: Payload, slug: string, doc: Doc): void {
  const resolve = PAGES[slug]
  const key = indexNowKey()
  if (!resolve || !key || !indexNowEnabled()) return
  const query = ((text, values) => (payload.db as unknown as { pool: { query: Query } }).pool.query(text, values)) as Query
  try {
    after(async () => {
      try {
        await runIndexNow({ base: siteUrl(), key, pages: await resolve(payload, doc), query })
      } catch (e) {
        console.error(`[indexnow] ${slug} ${String(doc.id)}: ${e instanceof Error ? e.message : String(e)}`)
      }
    })
  } catch {
    // after() outside a request scope: not a web request, nothing to tell search engines.
  }
}

const isDraftOnly = (c: CollectionConfig, doc: Doc | undefined, previous?: Doc) => {
  const drafts = typeof c.versions === 'object' && c.versions?.drafts
  return Boolean(drafts) && doc?._status !== 'published' && previous?._status !== 'published'
}

export function withIndexNow(c: CollectionConfig): CollectionConfig {
  if (!PAGES[c.slug]) return c
  // Published, unpublished (the page is gone: engines should recrawl it) or a collection without drafts.
  const afterChange: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
    if (!isDraftOnly(c, doc as Doc, previousDoc as Doc)) queueIndexNow(req.payload, c.slug, doc as Doc)
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
    if (!isDraftOnly(c, doc as Doc)) queueIndexNow(req.payload, c.slug, doc as Doc)
  }
  return {
    ...c,
    hooks: {
      ...c.hooks,
      afterChange: [...(c.hooks?.afterChange ?? []), afterChange],
      afterDelete: [...(c.hooks?.afterDelete ?? []), afterDelete],
    },
  }
}
