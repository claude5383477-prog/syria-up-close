import { indexablePaths } from '@/lib/seo'

// IndexNow (indexnow.org): tells Bing, Yandex, Naver, Seznam and Yep that a page changed, instead of
// waiting for their next crawl. Google does not take part; it reads the sitemap's lastmod.
// The rules live here (pure, unit-tested); hooks/indexNow wires them to Payload.

/** The shared endpoint: participating engines pass submissions to each other. */
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
/** Where the key is served (app/indexnow-key.txt/route.ts). At the root, so it covers every URL on the host. */
export const INDEXNOW_KEY_PATH = '/indexnow-key.txt'
/** The same URL is sent at most once in this many minutes (across all Vercel instances: database). */
export const DEDUPE_MINUTES = 10
/** The protocol's cap per request. */
const MAX_URLS = 10_000

type Env = Record<string, string | undefined>

/** 8 to 128 characters: letters, digits and dashes (indexnow.org documentation). */
export const isIndexNowKey = (k: unknown): k is string => typeof k === 'string' && /^[A-Za-z0-9-]{8,128}$/.test(k)

export const indexNowKey = (env: Env = process.env): string | null => (isIndexNowKey(env.INDEXNOW_KEY) ? env.INDEXNOW_KEY : null)

/** Production only: never from a Preview, a local server, the seed or the tests. */
export const indexNowEnabled = (env: Env = process.env): boolean => env.VERCEL_ENV === 'production' && indexNowKey(env) !== null

/** A changed page, before it is split into its indexable language URLs (lib/seo rule). */
export type PageRef = { path: string; translated?: boolean }

export function indexNowUrls(base: string, pages: PageRef[]): string[] {
  return [...new Set(pages.flatMap((p) => indexablePaths(p.path, p.translated ?? true).map((path) => `${base}${path}`)))]
}

export function indexNowBody(base: string, key: string, urls: string[]) {
  return { host: new URL(base).host, key, keyLocation: `${base}${INDEXNOW_KEY_PATH}`, urlList: urls }
}

/** A SQL runner (payload.db.pool.query in production, a fake in tests). */
export type Query = (text: string, values: unknown[]) => Promise<{ rows: { url: string }[] }>

/**
 * Marks the URLs as sent now and returns those that may go: new ones, and ones last sent more than
 * DEDUPE_MINUTES ago. One atomic statement, so two instances saving at once never both send a URL.
 */
export async function claimUrls(query: Query, urls: string[]): Promise<string[]> {
  if (!urls.length) return []
  const { rows } = await query(
    `INSERT INTO indexnow_log (url, sent_at) SELECT u, now() FROM unnest($1::text[]) AS u
     ON CONFLICT (url) DO UPDATE SET sent_at = excluded.sent_at
     WHERE indexnow_log.sent_at < now() - make_interval(mins => $2)
     RETURNING url`,
    [urls, DEDUPE_MINUTES],
  )
  return rows.map((r) => r.url)
}

/** A send that failed: forget it, so the next change to these pages tries again. */
export async function releaseUrls(query: Query, urls: string[]): Promise<void> {
  if (urls.length) await query('DELETE FROM indexnow_log WHERE url = ANY($1::text[])', [urls])
}

export type Log = { info: (msg: string) => void; error: (msg: string) => void }

/**
 * Sends the changed pages. Never throws: a failure is logged and the URLs released; whoever saved the
 * content never sees it. 200 = accepted, 202 = accepted while the key is still being checked.
 */
export async function runIndexNow(o: { base: string; key: string; pages: PageRef[]; query: Query; fetchFn?: typeof fetch; log?: Log }): Promise<{ sent: string[]; status?: number }> {
  const log = o.log ?? console
  const fetchFn = o.fetchFn ?? fetch
  let claimed: string[] = []
  try {
    claimed = await claimUrls(o.query, indexNowUrls(o.base, o.pages))
    if (!claimed.length) return { sent: [] }
    let status = 0
    for (let i = 0; i < claimed.length; i += MAX_URLS) {
      const res = await fetchFn(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(indexNowBody(o.base, o.key, claimed.slice(i, i + MAX_URLS))),
        signal: AbortSignal.timeout(10_000),
      })
      status = res.status
      if (status !== 200 && status !== 202) throw new Error(`IndexNow answered ${status}`)
    }
    log.info(`[indexnow] ${status}: ${claimed.join(' ')}`)
    return { sent: claimed, status }
  } catch (e) {
    log.error(`[indexnow] not sent (${e instanceof Error ? e.message : String(e)}): ${claimed.join(' ')}`)
    await releaseUrls(o.query, claimed).catch(() => undefined)
    return { sent: [] }
  }
}
