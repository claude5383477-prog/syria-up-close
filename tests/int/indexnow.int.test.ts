import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { claimUrls, releaseUrls, type Query } from '@/lib/indexnow'
import { makeUser, payload, resetWithAdmin } from './helpers'

// The de-duplication SQL against the real indexnow_log table (migration 20261028_072400_indexnow_log).

let query: Query

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  const pool = (p.db as unknown as { pool: { query: Query } }).pool
  query = (text, values) => pool.query(text, values)
  await query('DELETE FROM indexnow_log', [])
})
afterAll(() => vi.unstubAllEnvs())

describe('indexnow_log', () => {
  it('claims new URLs once; a second claim within 10 minutes gets nothing', async () => {
    expect(await claimUrls(query, ['https://x.org/a', 'https://x.org/b'])).toEqual(['https://x.org/a', 'https://x.org/b'])
    expect(await claimUrls(query, ['https://x.org/a', 'https://x.org/c'])).toEqual(['https://x.org/c'])
  })

  it('a URL last sent more than 10 minutes ago goes again', async () => {
    await query("UPDATE indexnow_log SET sent_at = now() - interval '11 minutes' WHERE url = $1", ['https://x.org/a'])
    expect(await claimUrls(query, ['https://x.org/a', 'https://x.org/b'])).toEqual(['https://x.org/a'])
  })

  it('released URLs (a failed send) can be claimed again at once', async () => {
    await releaseUrls(query, ['https://x.org/b'])
    expect(await claimUrls(query, ['https://x.org/b'])).toEqual(['https://x.org/b'])
  })

  it('saving content outside a web request (seed, scripts) never fails because of IndexNow', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('INDEXNOW_KEY', 'a1b2c3d4e5f60718293a4b5c6d7e8f90')
    const p = await payload()
    const editor = await makeUser('editor')
    const city = await p.create({ collection: 'cities', data: { slug: 'homs', name: 'حمص' }, user: editor, overrideAccess: false })
    await expect(p.create({ collection: 'statusItems', data: { city: city.id, type: 'roads', value: 'سالكة' }, user: editor, overrideAccess: false })).resolves.toMatchObject({ value: 'سالكة' })
  })
})
