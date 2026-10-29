import { beforeAll, describe, expect, it } from 'vitest'
import type { Endpoint, PayloadRequest } from 'payload'
import { getCityGuides, getCityVideos, getGuide, getGuides, getVideos } from '@/data/queries'
import { bookingEndpoints, testMailEndpoint } from '@/endpoints/bookings'
import { siteOrigins } from '@/lib/site-url'
import type { Booking, City, Guide, User } from '@/payload-types'
import { makeUser, payload, resetWithAdmin } from './helpers'

let editor: User
let correspondent: User
let damascus: City
let aleppo: City
let guide: Guide
let tripId: string

const endpoint = (path: string) => bookingEndpoints.find((e) => e.path === path)!
const call = async (e: Endpoint, o: { body?: unknown; headers?: Record<string, string>; user?: User | null; id?: number; url?: string }) => {
  const p = await payload()
  const req = {
    payload: p,
    user: o.user ?? null,
    headers: new Headers(o.headers ?? {}),
    json: async () => o.body,
    routeParams: o.id ? { id: String(o.id) } : {},
    url: o.url ?? 'http://localhost:3000/api/bookings',
  } as unknown as PayloadRequest
  const res = await e.handler(req)
  return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text() }
}
// Ten days from now: inside the two-year booking window.
const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
const origin = () => ({ origin: siteOrigins()[0]!, 'x-forwarded-for': '10.0.0.1' })
const form = () => ({ guide: guide.id, trip: tripId, date: soon, people: 2, language: 'en', name: 'Lina', email: 'lina@example.com', consent: 'on', website: '' })

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor')
  correspondent = await makeUser('correspondent')
  const as = { user: editor, overrideAccess: false } as const
  damascus = await p.create({ collection: 'cities', data: { slug: 'damascus', name: 'دمشق' }, locale: 'ar', ...as })
  aleppo = await p.create({ collection: 'cities', data: { slug: 'aleppo', name: 'حلب' }, locale: 'ar', ...as })
  guide = await p.create({
    collection: 'guides',
    locale: 'ar',
    data: { name: 'دليل', slug: 'g-one', city: damascus.id, languages: ['ar', 'en'], trips: [{ title: 'المدينة القديمة', duration: '3 ساعات' }], contactEmail: 'guide@example.com', verifiedAt: '2026-10-26T00:00:00.000Z', _status: 'published' },
    ...as,
  })
  tripId = guide.trips![0]!.id!
  await p.create({ collection: 'guides', locale: 'ar', data: { name: 'مسودة', slug: 'g-draft', city: aleppo.id, languages: ['ar'] }, draft: true, ...as })
  await p.create({ collection: 'videos', locale: 'ar', data: { url: 'https://youtu.be/dQw4w9WgXcQ', title: 'جولة', author: 'صانع', city: damascus.id, _status: 'published' }, ...as })
  await p.create({ collection: 'videos', locale: 'ar', data: { url: 'https://www.tiktok.com/@a/video/7312345678901234567', title: 'مسودة', author: 'ب' }, draft: true, ...as })
})

describe('guides and videos (public queries)', () => {
  it('return published guides only, without their private e-mail', async () => {
    const all = await getGuides()
    expect(all.map((g) => g.slug)).toEqual(['g-one'])
    expect(await getGuide('g-draft')).toBeNull()
    expect((await getGuide('g-one')) as Record<string, unknown>).not.toHaveProperty('contactEmail')
    expect((await getCityGuides(damascus.id)).map((g) => g.slug)).toEqual(['g-one'])
    expect(await getCityGuides(aleppo.id)).toEqual([])
  })

  it('return published videos only, with the platform read from the link', async () => {
    const all = await getVideos()
    expect(all.map((v) => [v.platform, v.videoId, v.orientation])).toEqual([['youtube', 'dQw4w9WgXcQ', 'wide']])
    expect((await getCityVideos(damascus.id)).length).toBe(1)
    expect(await getCityVideos(aleppo.id)).toEqual([])
  })

  it('refuse a link that is not a YouTube, Instagram or TikTok video', async () => {
    const p = await payload()
    await expect(p.create({ collection: 'videos', data: { url: 'https://vimeo.com/1', title: 'x', author: 'y' }, user: editor, overrideAccess: false })).rejects.toThrow()
  })
})

describe('bookings', () => {
  it('saves a request with its number, and tells the visitor only the number', async () => {
    const res = await call(endpoint('/request'), { body: form(), headers: origin() })
    expect(res.status).toBe(201)
    expect(res.body.code).toMatch(/^SUC-\d{4}$/)
    const p = await payload()
    const [b] = (await p.find({ collection: 'bookings', where: { code: { equals: res.body.code } }, overrideAccess: true })).docs as Booking[]
    expect(b).toMatchObject({ status: 'new', trip: 'المدينة القديمة (3 ساعات)', people: 2, language: 'en', email: 'lina@example.com', consent: true })
  })

  it('refuses other sites, bad input, drafts and spam', async () => {
    expect((await call(endpoint('/request'), { body: form(), headers: { origin: 'https://evil.example' } })).status).toBe(403)
    expect(await call(endpoint('/request'), { body: { ...form(), email: 'x', consent: '' }, headers: origin() })).toEqual({ status: 422, body: { error: 'invalid', fields: ['email', 'consent'] } })
    const draft = (await (await payload()).find({ collection: 'guides', draft: true, where: { slug: { equals: 'g-draft' } }, overrideAccess: true })).docs[0]!
    expect((await call(endpoint('/request'), { body: { ...form(), guide: draft.id }, headers: origin() })).status).toBe(404)
    const before = (await (await payload()).count({ collection: 'bookings', overrideAccess: true })).totalDocs
    expect(await call(endpoint('/request'), { body: { ...form(), website: 'x' }, headers: origin() })).toEqual({ status: 200, body: { code: null } })
    expect((await (await payload()).count({ collection: 'bookings', overrideAccess: true })).totalDocs).toBe(before)
  })

  it('limits requests from the same address', async () => {
    const h = { ...origin(), 'x-forwarded-for': '10.9.9.9' }
    for (let i = 0; i < 3; i++) expect((await call(endpoint('/request'), { body: form(), headers: h })).status).toBe(201)
    expect(await call(endpoint('/request'), { body: form(), headers: h })).toEqual({ status: 429, body: { error: 'rate' } })
    expect((await call(endpoint('/request'), { body: form(), headers: { ...h, 'x-forwarded-for': '10.9.9.10' } })).status).toBe(201)
  })

  it('are read only by editors and admins, and never created through the API', async () => {
    const p = await payload()
    await expect(p.find({ collection: 'bookings', overrideAccess: false })).rejects.toThrow()
    await expect(p.find({ collection: 'bookings', user: correspondent, overrideAccess: false })).rejects.toThrow()
    const seen = await p.find({ collection: 'bookings', user: editor, overrideAccess: false })
    expect(seen.totalDocs).toBeGreaterThan(0)
    expect(seen.docs[0]).not.toHaveProperty('clientKey')
    await expect(p.create({ collection: 'bookings', user: editor, overrideAccess: false, data: { guide: guide.id, trip: 'x', date: '2099-01-01', people: 1, language: 'ar', name: 'x', email: 'x@y.co', consent: true } as never })).rejects.toThrow()
  })

  it('staff confirm, cancel and export; nobody else', async () => {
    const p = await payload()
    const b = (await p.find({ collection: 'bookings', overrideAccess: true, limit: 1 })).docs[0]!
    expect((await call(endpoint('/:id/status'), { id: b.id, body: { status: 'confirmed' }, user: correspondent })).status).toBe(403)
    expect((await call(endpoint('/:id/status'), { id: b.id, body: { status: 'paid' }, user: editor })).status).toBe(422)
    // No e-mail adapter in tests: saved, and honestly reported as not mailed.
    expect(await call(endpoint('/:id/status'), { id: b.id, body: { status: 'confirmed', internalNote: 'حكينا الدليل' }, user: editor })).toEqual({ status: 200, body: { status: 'confirmed', mailed: false } })
    expect((await p.findByID({ collection: 'bookings', id: b.id, overrideAccess: true })).internalNote).toBe('حكينا الدليل')
    expect((await call(endpoint('/:id/status'), { id: b.id, body: { status: 'cancelled' }, user: editor })).body.status).toBe('cancelled')
    expect((await call(endpoint('/export'), { user: null })).status).toBe(403)
    const csv = await call(endpoint('/export'), { user: editor })
    expect(csv.status).toBe(200)
    expect(String(csv.body)).toContain(b.code)
  })

  it('cron needs the secret, follows the settings, and reminds once', async () => {
    const p = await payload()
    process.env.CRON_SECRET = 'cron-test-secret'
    const cron = (kind: string, secret = 'cron-test-secret') => call(endpoint('/cron'), { headers: { authorization: `Bearer ${secret}` }, url: `http://localhost/api/bookings/cron?kind=${kind}` })
    expect((await cron('digest', 'wrong')).status).toBe(401)
    expect((await cron('weekly')).status).toBe(422)
    expect(await cron('digest')).toEqual({ status: 200, body: { sent: 0, off: true } })
    const old = (await p.find({ collection: 'bookings', overrideAccess: true, where: { status: { equals: 'new' } }, limit: 1 })).docs[0]!
    await (p.db as unknown as { pool: { query: (q: string, v: unknown[]) => Promise<unknown> } }).pool.query(`update bookings set created_at = now() - interval '2 days' where id = $1`, [old.id])
    await p.updateGlobal({ slug: 'notificationSettings', data: { emails: [{ email: 'team@example.com' }] }, overrideAccess: true })
    // No adapter: nothing is sent, so nothing is marked as reminded.
    expect(await cron('reminder')).toEqual({ status: 200, body: { sent: 0 } })
    expect((await p.findByID({ collection: 'bookings', id: old.id, overrideAccess: true })).remindedAt ?? null).toBeNull()
  })

  it('test e-mail: staff only, needs an address', async () => {
    const p = await payload()
    expect((await call(testMailEndpoint, { user: null })).status).toBe(403)
    await p.updateGlobal({ slug: 'notificationSettings', data: { emails: [] }, overrideAccess: true })
    expect(await call(testMailEndpoint, { user: editor })).toEqual({ status: 422, body: { sent: 0, error: 'no-emails' } })
    await p.updateGlobal({ slug: 'notificationSettings', data: { emails: [{ email: 'team@example.com' }] }, overrideAccess: true })
    expect(await call(testMailEndpoint, { user: editor })).toEqual({ status: 502, body: { sent: 0 } })
    await expect(p.findGlobal({ slug: 'notificationSettings', overrideAccess: false })).rejects.toThrow()
  })
})
