import { beforeAll, describe, expect, it } from 'vitest'
import { down, up } from '@/migrations/20261026_080000_rural_content'
import { payload, resetWithAdmin } from './helpers'

type Db = Parameters<typeof up>[0]['db']

describe('migration 20261026_080000_rural_content (content)', () => {
  let db: Db
  const city = async (slug: string) => (await (await payload()).find({ collection: 'cities', where: { slug: { equals: slug } }, depth: 0 })).docs[0]!
  const trip = async (slug: string) => (await (await payload()).find({ collection: 'dayTrips', where: { slug: { equals: slug } }, depth: 0 })).docs[0]

  beforeAll(async () => {
    await resetWithAdmin()
    const p = await payload()
    db = (p.db as unknown as { drizzle: Db }).drizzle
    for (const slug of ['damascus', 'homs', 'tartous', 'bloudan', 'palmyra']) await p.create({ collection: 'cities', data: { slug, name: slug }, locale: 'ar', overrideAccess: true })
    const id = async (s: string) => (await city(s)).id
    await p.create({ collection: 'dayTrips', data: { fromCity: await id('damascus'), title: 'بلودان والزبداني' }, overrideAccess: true })
    await p.create({ collection: 'dayTrips', data: { fromCity: await id('homs'), title: 'مشتى الحلو' }, overrideAccess: true })
    await p.create({ collection: 'dayTrips', data: { fromCity: await id('palmyra'), title: 'بساتين النخيل' }, overrideAccess: true })
    await p.create({ collection: 'dayTrips', data: { fromCity: await id('damascus'), title: 'مشوار محرر', slug: 'editor-trip', tag: 'وسم المحرر' }, overrideAccess: true })
  })

  it('moves resorts under their city, gives every known trip a page, and fills Bloudan once', async () => {
    const run = { db } as Parameters<typeof up>[0]
    await up(run)
    await up(run)
    expect((await city('bloudan')).parentCity).toBe((await city('damascus')).id)
    expect((await city('palmyra')).parentCity).toBe((await city('homs')).id)
    expect((await city('damascus')).parentCity ?? null).toBeNull()

    const bloudan = await trip('bloudan')
    expect(bloudan).toMatchObject({ title: 'بلودان', tag: 'مصيف', place: (await city('bloudan')).id, distanceNote: 'نحو 50 كم من دمشق' })
    expect(bloudan?.spots?.map((s) => s.name)).toHaveLength(10)
    expect(bloudan?.spots?.[0]).toMatchObject({ kind: 'stay', name: 'فندق بلودان الكبير', lat: 33.72135 })

    const palmyra = await trip('palmyra')
    expect(palmyra).toMatchObject({ title: 'تدمر', fromCity: (await city('homs')).id, place: (await city('palmyra')).id })
    expect((await trip('mashta-al-helu'))?.fromCity).toBe((await city('tartous')).id)
    expect(await trip('zabadani')).toMatchObject({ title: 'الزبداني' })
    expect(await trip('editor-trip')).toMatchObject({ title: 'مشوار محرر', tag: 'وسم المحرر' })
  })

  it('undoes the links and removes what it added on the way down', async () => {
    await down({ db } as Parameters<typeof down>[0])
    expect((await city('bloudan')).parentCity ?? null).toBeNull()
    const p = await payload()
    const titles = (await p.find({ collection: 'dayTrips', limit: 100, depth: 0 })).docs.map((d) => d.title)
    expect(titles).not.toContain('الزبداني')
    expect(titles).toContain('بلودان')
    expect(await trip('editor-trip')).toMatchObject({ tag: 'وسم المحرر' })
    expect(await trip('bloudan')).toBeUndefined()
  })
})
