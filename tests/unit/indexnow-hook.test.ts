import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollectionConfig, Payload } from 'payload'

// next/server's after(): captured so the test decides when the background work runs.
const pending: (() => Promise<void>)[] = []
let afterThrows = false
vi.mock('next/server', () => ({
  after: (fn: () => Promise<void>) => {
    if (afterThrows) throw new Error('`after` was called outside a request scope')
    pending.push(fn)
  },
}))

const { PAGES, queueIndexNow, withIndexNow } = await import('@/hooks/indexNow')

const KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
const base = 'https://www.upclosesyria.com'

type Row = Record<string, unknown>
const CITIES: Row[] = [
  { id: 1, slug: 'damascus', parentCity: null, name: { ar: 'دمشق', en: 'Damascus' }, lede: { ar: 'حارات', en: 'Lanes' } },
  { id: 2, slug: 'bloudan', parentCity: 1, name: { ar: 'بلودان' }, lede: { ar: 'مصيف' } },
  { id: 3, slug: 'aleppo', parentCity: null, name: { ar: 'حلب' }, lede: { ar: 'قلعة' } },
]
const TRIPS: Row[] = [{ id: 9, slug: 'bloudan', place: 2 }]
const STORIES: Row[] = [{ id: 5, title: { ar: 'ق', en: 'S' }, body: null }]

function fakePayload() {
  const sent = new Set<string>()
  const query = vi.fn(async (text: string, values: unknown[]) => {
    if (text.startsWith('DELETE')) return { rows: [] }
    const rows = (values[0] as string[]).filter((u) => !sent.has(u)).map((url) => ({ url }))
    rows.forEach((r) => sent.add(r.url))
    return { rows }
  })
  const find = vi.fn(async ({ collection, where }: { collection: string; where: Record<string, { equals: number }> }) => {
    const table = collection === 'cities' ? CITIES : collection === 'dayTrips' ? TRIPS : collection === 'stories' ? STORIES : []
    const [field, cond] = Object.entries(where)[0]!
    return { docs: table.filter((r) => r[field] === cond.equals) }
  })
  return { payload: { find, db: { pool: { query } } } as unknown as Payload, find, query }
}

let fetchMock: ReturnType<typeof vi.fn>
const posted = () => fetchMock.mock.calls.flatMap((c) => (JSON.parse(String((c[1] as RequestInit).body)) as { urlList: string[] }).urlList)
const flush = async () => {
  while (pending.length) await pending.shift()!()
}

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('INDEXNOW_KEY', KEY)
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', base)
  fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  pending.length = 0
  afterThrows = false
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const pagesOf = async (slug: string, doc: Row) => PAGES[slug]!(fakePayload().payload, doc)

describe('which pages a change touches', () => {
  it('a status item (or place, stay, venue, lore, photo): its city page, in both languages when translated', async () => {
    for (const slug of ['statusItems', 'places', 'stays', 'venues', 'cityLore', 'cityPhotos']) {
      expect(await pagesOf(slug, { id: 1, city: 1 })).toEqual([{ path: '/cities/damascus', translated: true }])
    }
    expect(await pagesOf('places', { id: 1, city: { id: 3 } })).toEqual([{ path: '/cities/aleppo', translated: false }])
  })

  it("a resort's content: the trip page that replaced its city page", async () => {
    expect(await pagesOf('stays', { id: 1, city: 2 })).toEqual([{ path: '/inside/bloudan' }])
  })

  it('missing or hidden city: nothing', async () => {
    expect(await pagesOf('places', { id: 1, city: 99 })).toEqual([])
    expect(await pagesOf('places', { id: 1, city: null })).toEqual([])
  })

  it('a city: its page and the cities list; a deleted city still sends its old address', async () => {
    expect(await pagesOf('cities', { id: 1, slug: 'damascus' })).toEqual([{ path: '/cities/damascus', translated: true }, { path: '/cities' }])
    expect(await pagesOf('cities', { id: 77, slug: 'gone', parentCity: null })).toEqual([{ path: '/cities/gone' }, { path: '/cities' }])
    expect(await pagesOf('cities', { id: 78, slug: 'gone-resort', parentCity: 1 })).toEqual([{ path: '/cities' }])
  })

  it('a trip: its page, the countryside list and the city page that lists it', async () => {
    expect(await pagesOf('dayTrips', { id: 4, slug: 'maaloula', fromCity: 1 })).toEqual([{ path: '/inside/maaloula' }, { path: '/inside' }, { path: '/cities/damascus', translated: true }])
    expect(await pagesOf('dayTrips', { id: 4, slug: null, fromCity: null })).toEqual([{ path: '/inside/trip-4' }, { path: '/inside' }])
  })

  it('a season report, a story, a first-visit page and the daily detail', async () => {
    expect(await pagesOf('seasonReports', { id: 1, slug: 'olives' })).toEqual([{ path: '/seasons/olives' }, { path: '/seasons' }, { path: '/' }])
    expect(await pagesOf('seasonReports', { id: 1 })).toEqual([{ path: '/seasons' }, { path: '/' }])
    expect(await pagesOf('stories', { id: 5, slug: 'qasioun' })).toEqual([{ path: '/blog/qasioun', translated: true }, { path: '/blog' }, { path: '/' }])
    expect(await pagesOf('stories', { id: 6 })).toEqual([{ path: '/blog' }, { path: '/' }])
    expect(await pagesOf('firstVisitPages', { id: 99, topic: 'visa' })).toEqual([{ path: '/outside/first-visit/visa', translated: false }, { path: '/outside/first-visit' }])
    expect(await pagesOf('firstVisitPages', { topic: 'visa' })).toEqual([{ path: '/outside/first-visit/visa', translated: false }, { path: '/outside/first-visit' }])
    expect(await pagesOf('dailyDetail', { id: 1 })).toEqual([{ path: '/' }])
  })
})

describe('hooks', () => {
  const venues = withIndexNow({ slug: 'venues', fields: [], versions: { drafts: true } } as CollectionConfig)
  const status = withIndexNow({ slug: 'statusItems', fields: [], versions: { drafts: false } } as CollectionConfig)
  const change = (c: CollectionConfig, args: Row) => {
    const hook = c.hooks!.afterChange!.at(-1)!
    return hook(args as never)
  }
  const remove = (c: CollectionConfig, args: Row) => c.hooks!.afterDelete!.at(-1)!(args as never)

  it('leaves collections without public pages alone, keeps existing hooks', () => {
    const media = { slug: 'media', fields: [] } as CollectionConfig
    expect(withIndexNow(media)).toBe(media)
    const own = vi.fn()
    expect(withIndexNow({ slug: 'places', fields: [], hooks: { afterChange: [own] } } as CollectionConfig).hooks!.afterChange![0]).toBe(own)
  })

  it("a correspondent's status update sends the city page in both languages, after the response", async () => {
    const { payload } = fakePayload()
    const doc = { id: 7, city: 1 }
    expect(change(status, { doc, req: { payload } })).toBe(doc)
    expect(fetchMock).not.toHaveBeenCalled()
    await flush()
    expect(posted()).toEqual([`${base}/cities/damascus`, `${base}/en/cities/damascus`])
    expect(JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body))).toMatchObject({ host: 'www.upclosesyria.com', key: KEY, keyLocation: `${base}/indexnow-key.txt` })
  })

  it('drafts send nothing; publishing and unpublishing do', async () => {
    const { payload } = fakePayload()
    change(venues, { doc: { id: 1, city: 3, _status: 'draft' }, previousDoc: { _status: 'draft' }, req: { payload } })
    change(venues, { doc: { id: 1, city: 3, _status: 'draft' }, req: { payload } })
    expect(pending).toHaveLength(0)
    change(venues, { doc: { id: 1, city: 3, _status: 'published' }, req: { payload } })
    change(venues, { doc: { id: 1, city: 1, _status: 'draft' }, previousDoc: { _status: 'published' }, req: { payload } })
    expect(pending).toHaveLength(2)
    await flush()
    expect(posted()).toEqual([`${base}/cities/aleppo`, `${base}/cities/damascus`, `${base}/en/cities/damascus`])
  })

  it('deleting sends too, except a never-published draft', async () => {
    const { payload } = fakePayload()
    remove(venues, { doc: { id: 1, city: 3, _status: 'draft' }, req: { payload } })
    expect(pending).toHaveLength(0)
    remove(venues, { doc: { id: 1, city: 3, _status: 'published' }, req: { payload } })
    remove(status, { doc: { id: 2, city: 3 }, req: { payload } })
    await flush()
    expect(posted()).toEqual([`${base}/cities/aleppo`])
  })

  it('the same page twice within 10 minutes goes once', async () => {
    const { payload } = fakePayload()
    change(status, { doc: { id: 7, city: 3 }, req: { payload } })
    change(status, { doc: { id: 8, city: 3 }, req: { payload } })
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never outside Production, nor without a valid key', () => {
    const { payload } = fakePayload()
    vi.stubEnv('VERCEL_ENV', 'preview')
    change(status, { doc: { id: 7, city: 1 }, req: { payload } })
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('INDEXNOW_KEY', '')
    change(status, { doc: { id: 7, city: 1 }, req: { payload } })
    expect(pending).toHaveLength(0)
  })

  it('outside a request (seed, migrations) it quietly does nothing', () => {
    const { payload } = fakePayload()
    afterThrows = true
    expect(() => queueIndexNow(payload, 'statusItems', { id: 1, city: 1 })).not.toThrow()
  })

  it('a failure while working out the pages is logged, never thrown', async () => {
    const { payload, find } = fakePayload()
    find.mockRejectedValueOnce(new Error('db down'))
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    queueIndexNow(payload, 'statusItems', { id: 3, city: 1 })
    await expect(flush()).resolves.toBeUndefined()
    expect(err).toHaveBeenCalledWith(expect.stringContaining('[indexnow] statusItems 3: db down'))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
