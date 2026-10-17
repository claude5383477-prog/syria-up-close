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
    expect(await getStays(damascus.id)).toHaveLength(1)
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

  it('read the site settings', async () => {
    expect(await getSettings()).toMatchObject({ partnerLinkRel: 'sponsored noopener' })
  })
})
