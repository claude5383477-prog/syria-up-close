import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import { getSitemapSnapshot, isOwnImage } from '@/data/sitemap'
import { sectionPages, sitemapUrls } from '@/lib/sitemap'
import type { City, Media, User } from '@/payload-types'
import { makeUser, payload, resetWithAdmin } from './helpers'

// The sitemap's data, against a real database: what a visitor can see, with the right dates.

let editor: User
let damascus: City
let aleppo: City
let approved: Media
let unapproved: Media
const base = 'https://www.upclosesyria.com'

async function upload(user: User, alt: string): Promise<Media> {
  const data = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#B5713A' } }).png().toBuffer()
  return (await payload()).create({ collection: 'media', data: { alt }, file: { data, mimetype: 'image/png', name: `${alt}.png`, size: data.length }, user, overrideAccess: false })
}

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor')
  const as = { user: editor, overrideAccess: false } as const
  damascus = await p.create({ collection: 'cities', data: { slug: 'damascus', name: 'دمشق', lede: 'حارات' }, locale: 'ar', ...as })
  await p.update({ collection: 'cities', id: damascus.id, data: { name: 'Damascus', lede: 'Lanes' }, locale: 'en', ...as })
  aleppo = await p.create({ collection: 'cities', data: { slug: 'aleppo', name: 'حلب', lede: 'قلعة' }, locale: 'ar', ...as })
  approved = await upload(editor, 'سوق')
  unapproved = await upload(editor, 'سحبت-موافقتها')
  await p.create({ collection: 'places', data: { city: damascus.id, title: 'سوق', image: approved.id }, ...as })
  await p.create({ collection: 'places', data: { city: damascus.id, title: 'مسجد', image: unapproved.id }, ...as })
  // A linked photo that is private (set at the database level: hooks only ever approve photos).
  await p.db.updateOne({ collection: 'media', id: unapproved.id, data: { approved: false }, req: {} as never })
  await p.create({ collection: 'dayTrips', data: { fromCity: damascus.id, title: 'معلولا', slug: 'maaloula' }, ...as })
  await p.create({ collection: 'seasonReports', data: { title: 'منشور', city: aleppo.id, fieldDate: '2026-10-01', _status: 'published' }, ...as })
  await p.create({ collection: 'seasonReports', data: { title: 'مسودة', city: aleppo.id, fieldDate: '2026-10-02' }, draft: true, ...as })
  await p.create({ collection: 'stories', data: { slug: 'draft-story', title: 'مسودة' }, draft: true, ...as })
  await p.create({ collection: 'firstVisitPages', data: { topic: 'visa', title: 'مسودة' }, draft: true, ...as })
})

const urls = async (section: Parameters<typeof sectionPages>[0]) => sitemapUrls(base, sectionPages(section, await getSitemapSnapshot()))

describe('getSitemapSnapshot', () => {
  it('lists published content only: no drafts', async () => {
    const snap = await getSitemapSnapshot()
    expect(snap.reports).toHaveLength(1)
    expect(snap.firstVisit).toEqual([])
    expect(snap.stories.some((s) => s.slug === 'draft-story')).toBe(false)
    expect(snap.trips.map((t) => t.path)).toEqual(['/inside/maaloula'])
  })

  it('knows which cities are translated, so untranslated English stays out', async () => {
    const locs = (await urls('cities')).map((u) => u.loc)
    expect(locs).toEqual(expect.arrayContaining([`${base}/cities/damascus`, `${base}/en/cities/damascus`, `${base}/cities/aleppo`]))
    expect(locs).not.toContain(`${base}/en/cities/aleppo`)
  })

  it('includes approved photos and never an unapproved one', async () => {
    const snap = await getSitemapSnapshot()
    const images = snap.children.flatMap((c) => (c.image ? [c.image] : []))
    expect(images.some((i) => i.includes(approved.filename!))).toBe(true)
    expect(images.some((i) => i.includes(unapproved.filename!))).toBe(false)
  })

  it("a city page's lastmod moves when only one of its status items is verified", async () => {
    const p = await payload()
    const lastmod = async () => (await urls('cities')).find((u) => u.loc === `${base}/cities/damascus`)?.lastmod
    const before = await lastmod()
    const item = await p.create({ collection: 'statusItems', data: { city: damascus.id, type: 'electricity', value: 'ساعتين وصل' }, user: editor, overrideAccess: false })
    const row = await p.findByID({ collection: 'statusItems', id: item.id, overrideAccess: true, depth: 0 })
    const expected = [row.updatedAt, row.verifiedAt].filter(Boolean).sort().at(-1)
    // The snapshot is cached per request (React cache); outside a request every call reads afresh.
    const after = await lastmod()
    expect(after).toBe(new Date(expected!).toISOString())
    expect(Date.parse(after!)).toBeGreaterThanOrEqual(Date.parse(before!))
    const city = await p.findByID({ collection: 'cities', id: damascus.id, overrideAccess: true, depth: 0 })
    expect(Date.parse(after!)).toBeGreaterThan(Date.parse(city.updatedAt))
  })
})

describe('isOwnImage', () => {
  it("keeps the site's own photos and leaves out Commons and Flickr", () => {
    expect(isOwnImage('/guide/u-damascus-0.webp')).toBe(true)
    expect(isOwnImage('https://nde1hpzc2nmjymrd.public.blob.vercel-storage.com/guide/x.webp')).toBe(true)
    expect(isOwnImage('https://upload.wikimedia.org/x.jpg')).toBe(false)
    expect(isOwnImage('https://live.staticflickr.com/x.jpg')).toBe(false)
  })
})
