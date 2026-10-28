import { describe, expect, it, vi } from 'vitest'
import { claimUrls, DEDUPE_MINUTES, INDEXNOW_ENDPOINT, indexNowBody, indexNowEnabled, indexNowKey, indexNowUrls, isIndexNowKey, releaseUrls, runIndexNow, type Query } from '@/lib/indexnow'

const base = 'https://www.upclosesyria.com'
const KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

describe('key and switch', () => {
  it('accepts 8–128 letters, digits and dashes only', () => {
    expect(isIndexNowKey(KEY)).toBe(true)
    expect(isIndexNowKey('ab-CD-12')).toBe(true)
    expect(isIndexNowKey('short')).toBe(false)
    expect(isIndexNowKey('x'.repeat(129))).toBe(false)
    expect(isIndexNowKey('has space here')).toBe(false)
    expect(isIndexNowKey(undefined)).toBe(false)
    expect(indexNowKey({ INDEXNOW_KEY: KEY })).toBe(KEY)
    expect(indexNowKey({ INDEXNOW_KEY: 'bad key!' })).toBeNull()
  })

  it('runs in Production only, and only with a valid key', () => {
    expect(indexNowEnabled({ VERCEL_ENV: 'production', INDEXNOW_KEY: KEY })).toBe(true)
    expect(indexNowEnabled({ VERCEL_ENV: 'preview', INDEXNOW_KEY: KEY })).toBe(false)
    expect(indexNowEnabled({ INDEXNOW_KEY: KEY })).toBe(false)
    expect(indexNowEnabled({ VERCEL_ENV: 'production' })).toBe(false)
  })
})

describe('what is sent', () => {
  it('both languages of a translated page, Arabic only for Arabic-only sections and untranslated pages', () => {
    expect(indexNowUrls(base, [{ path: '/cities/damascus', translated: true }, { path: '/inside/bloudan' }, { path: '/blog/x', translated: false }, { path: '/cities/damascus' }])).toEqual([
      `${base}/cities/damascus`,
      `${base}/en/cities/damascus`,
      `${base}/inside/bloudan`,
      `${base}/blog/x`,
    ])
  })

  it('the request body names the host and the key file at the root', () => {
    expect(indexNowBody(base, KEY, [`${base}/`])).toEqual({ host: 'www.upclosesyria.com', key: KEY, keyLocation: `${base}/indexnow-key.txt`, urlList: [`${base}/`] })
  })
})

/** An in-memory stand-in for the indexnow_log table, honouring the 10-minute rule. */
function fakeLog(now = () => Date.now()) {
  const sent = new Map<string, number>()
  const query: Query = vi.fn(async (text: string, values: unknown[]) => {
    const urls = values[0] as string[]
    if (text.startsWith('DELETE')) {
      for (const u of urls) sent.delete(u)
      return { rows: [] }
    }
    const mins = values[1] as number
    const rows = urls.filter((u) => !sent.has(u) || sent.get(u)! < now() - mins * 60_000).map((url) => ({ url }))
    for (const r of rows) sent.set(r.url, now())
    return { rows }
  })
  return { query, sent }
}

describe('de-duplication', () => {
  it('a URL goes once per 10 minutes, then again', async () => {
    let t = Date.parse('2026-10-28T10:00:00Z')
    const { query } = fakeLog(() => t)
    expect(await claimUrls(query, ['a', 'b'])).toEqual(['a', 'b'])
    t += 5 * 60_000
    expect(await claimUrls(query, ['a', 'c'])).toEqual(['c'])
    t += (DEDUPE_MINUTES + 1) * 60_000
    expect(await claimUrls(query, ['a'])).toEqual(['a'])
  })

  it('no URLs, no query', async () => {
    const { query } = fakeLog()
    expect(await claimUrls(query, [])).toEqual([])
    await releaseUrls(query, [])
    expect(query).not.toHaveBeenCalled()
  })

  it('the claim is one atomic statement on indexnow_log', async () => {
    const { query } = fakeLog()
    await claimUrls(query, ['a'])
    expect(vi.mocked(query).mock.calls[0]![0]).toMatch(/INSERT INTO indexnow_log[\s\S]*ON CONFLICT \(url\) DO UPDATE[\s\S]*RETURNING url/)
    expect(vi.mocked(query).mock.calls[0]![1]).toEqual([['a'], 10])
  })
})

describe('runIndexNow', () => {
  const log = () => ({ info: vi.fn(), error: vi.fn() })

  it('posts the claimed URLs once, as JSON, and logs the answer', async () => {
    const { query } = fakeLog()
    const fetchFn = vi.fn(async () => new Response(null, { status: 202 }))
    const l = log()
    const r = await runIndexNow({ base, key: KEY, pages: [{ path: '/cities/damascus', translated: true }], query, fetchFn: fetchFn as never, log: l })
    expect(r).toEqual({ sent: [`${base}/cities/damascus`, `${base}/en/cities/damascus`], status: 202 })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(INDEXNOW_ENDPOINT)
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual(indexNowBody(base, KEY, r.sent))
    expect(l.info).toHaveBeenCalledWith(expect.stringContaining('[indexnow] 202'))
    // Saved again a minute later: nothing goes out.
    expect(await runIndexNow({ base, key: KEY, pages: [{ path: '/cities/damascus', translated: true }], query, fetchFn: fetchFn as never, log: l })).toEqual({ sent: [] })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('a refused or failed send is logged, never thrown, and released for the next change', async () => {
    const { query, sent } = fakeLog()
    const l = log()
    for (const fetchFn of [vi.fn(async () => new Response(null, { status: 403 })), vi.fn(async () => Promise.reject(new Error('network down')))]) {
      expect(await runIndexNow({ base, key: KEY, pages: [{ path: '/seasons' }], query, fetchFn: fetchFn as never, log: l })).toEqual({ sent: [] })
      expect(sent.size).toBe(0)
    }
    expect(l.error).toHaveBeenNthCalledWith(1, expect.stringContaining('IndexNow answered 403'))
    expect(l.error).toHaveBeenNthCalledWith(2, expect.stringContaining('network down'))
  })

  it('a database failure is logged too', async () => {
    const l = log()
    const query: Query = async () => Promise.reject('db down')
    expect(await runIndexNow({ base, key: KEY, pages: [{ path: '/' }], query, log: l })).toEqual({ sent: [] })
    expect(l.error).toHaveBeenCalledWith(expect.stringContaining('db down'))
  })

  it('logs to the console by default', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const { query } = fakeLog()
    await runIndexNow({ base, key: KEY, pages: [{ path: '/about' }], query, fetchFn: (async () => new Response(null, { status: 200 })) as never })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[indexnow] 200'))
    spy.mockRestore()
  })
})
