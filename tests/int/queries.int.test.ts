import { beforeAll, describe, expect, it } from 'vitest'
import {
  getCities,
  getCity,
  getDailyDetail,
  getDayTrips,
  getFirstVisitPage,
  getFirstVisitPages,
  getLatestReports,
  getPlaces,
  getReport,
  getSettings,
  getStatusItems,
  getStays,
  getAllStays,
  getCityLore,
  getCityPhotos,
  getStories,
  getStory,
  getVenues,
} from '@/data/queries'
import type { City, User } from '@/payload-types'
import { makeUser, payload, resetWithAdmin } from './helpers'

let editor: User
let damascus: City

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor')
  const as = { user: editor, overrideAccess: false } as const
  damascus = await p.create({ collection: 'cities', data: { slug: 'damascus', name: 'دمشق', lede: 'حارات' }, locale: 'ar', ...as })
  await p.update({ collection: 'cities', id: damascus.id, data: { name: 'Damascus' }, locale: 'en', ...as })
  await p.create({ collection: 'places', data: { city: damascus.id, title: 'ب', order: 2 }, ...as })
  await p.create({ collection: 'places', data: { city: damascus.id, title: 'أ', order: 1 }, ...as })
  await p.create({ collection: 'statusItems', data: { city: damascus.id, type: 'roads', value: 'سالكة' }, ...as })
  await p.create({ collection: 'stays', data: { city: damascus.id, title: 'بيت', ahleenUrl: 'https://ahleenbooking.com/s/1' }, ...as })
  await p.create({ collection: 'dayTrips', data: { fromCity: damascus.id, title: 'معلولا' }, ...as })
  await p.create({ collection: 'stays', data: { city: damascus.id, title: 'فندق غير مدرج' }, ...as })
  await p.create({ collection: 'venues', data: { city: damascus.id, kind: 'cafe', name: 'منشور', order: 2, _status: 'published' }, ...as })
  await p.create({ collection: 'venues', data: { city: damascus.id, kind: 'park', name: 'حديقة', order: 1, _status: 'published' }, ...as })
  await p.create({ collection: 'venues', data: { city: damascus.id, kind: 'restaurant', name: 'مسودة' }, draft: true, ...as })
  await p.create({ collection: 'cityLore', data: { city: damascus.id, kind: 'proverb', text: 'مثل منشور', tellerName: 'راوٍ', _status: 'published' }, ...as })
  await p.create({ collection: 'cityLore', data: { city: damascus.id, kind: 'secret', text: 'سرّ مسودة', tellerName: 'راوٍ' }, draft: true, ...as })
  await p.create({ collection: 'stories', data: { slug: 'old', title: 'قديمة', category: 'food', publishedAt: '2026-09-01', _status: 'published' }, ...as })
  await p.create({ collection: 'stories', data: { slug: 'new', title: 'جديدة', publishedAt: '2026-10-01', _status: 'published' }, ...as })
  await p.create({ collection: 'stories', data: { slug: 'draft', title: 'مسودة' }, draft: true, ...as })
  await p.create({ collection: 'seasonReports', data: { title: 'منشور', city: damascus.id, fieldDate: '2026-10-01', _status: 'published' }, ...as })
  await p.create({ collection: 'seasonReports', data: { title: 'مسودة', city: damascus.id, fieldDate: '2026-10-02' }, draft: true, ...as })
  await p.create({ collection: 'firstVisitPages', data: { topic: 'visa', title: 'مسودة' }, draft: true, ...as })
  await p.create({ collection: 'dailyDetail', data: { date: '2026-10-10T00:00:00.000Z', sentence: 'قديمة' }, ...as })
  await p.create({ collection: 'dailyDetail', data: { date: '2026-10-15T00:00:00.000Z', sentence: 'الأحدث' }, ...as })
  await p.create({ collection: 'dailyDetail', data: { date: '2099-01-01T00:00:00.000Z', sentence: 'مستقبل' }, ...as })
})

describe('public queries (anonymous)', () => {
  it('return localized fields as { ar, en } maps', async () => {
    const cities = await getCities()
    expect(cities[0]?.name).toEqual({ ar: 'دمشق', en: 'Damascus' })
    expect((await getCity('damascus'))?.lede).toMatchObject({ ar: 'حارات' })
    expect(await getCity('nowhere')).toBeNull()
  })

  it('sort places and return the city’s items, stays and trips', async () => {
    expect((await getPlaces(damascus.id)).map((p) => (p.title as { ar: string }).ar)).toEqual(['أ', 'ب'])
    expect((await getStatusItems(damascus.id))[0]).toMatchObject({ type: 'roads', verifiedByName: editor.name })
    expect(await getStays(damascus.id)).toHaveLength(2)
    expect((await getDayTrips())[0]?.title).toBe('معلولا')
  })

  it('never return drafts', async () => {
    expect((await getLatestReports(10)).map((r) => r.title)).toEqual(['منشور'])
    expect(await getReport((await getLatestReports(1))[0]!.slug)).not.toBeNull()
    const draft = await (await payload()).find({ collection: 'seasonReports', where: { title: { equals: 'مسودة' } }, draft: true })
    expect(await getReport(draft.docs[0]!.slug!)).toBeNull()
    expect(await getFirstVisitPages()).toEqual([])
    expect(await getFirstVisitPage('visa')).toBeNull()
  })

  it('pick the latest daily detail not after today', async () => {
    expect((await getDailyDetail('2026-10-17'))?.sentence).toMatchObject({ ar: 'الأحدث' })
    expect(await getDailyDetail('2026-01-01')).toBeNull()
  })

  it('return a city’s published venues and lore in order, never drafts', async () => {
    expect((await getVenues(damascus.id)).map((v) => [v.kind, (v.name as { ar: string }).ar])).toEqual([
      ['park', 'حديقة'],
      ['cafe', 'منشور'],
    ])
    expect((await getCityLore(damascus.id)).map((l) => l.text)).toEqual(['مثل منشور'])
    expect(await getCityPhotos(damascus.id)).toEqual([])
  })

  it('list every stay, including those not on Ahleen (no booking link)', async () => {
    const all = await getAllStays()
    expect(all.map((s) => Boolean(s.ahleenUrl))).toEqual([true, false])
  })

  it('return published blog posts newest first, never drafts', async () => {
    expect((await getStories()).map((s) => s.slug)).toEqual(['new', 'old'])
    expect((await getStory('old'))?.category).toBe('food')
    expect(await getStory('draft')).toBeNull()
  })

  it('read the site settings', async () => {
    expect(await getSettings()).toMatchObject({ partnerLinkRel: 'sponsored noopener' })
  })
})
