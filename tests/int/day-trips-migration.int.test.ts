import { beforeAll, describe, expect, it } from 'vitest'
import { down, up } from '@/migrations/20261023_210000_more_day_trips'
import { payload, resetWithAdmin } from './helpers'

type Db = Parameters<typeof up>[0]['db']

describe('migration 20261023_210000_more_day_trips (content)', () => {
  let db: Db
  beforeAll(async () => {
    await resetWithAdmin()
    const p = await payload()
    db = (p.db as unknown as { drizzle: Db }).drizzle
    await p.create({ collection: 'cities', data: { slug: 'homs', name: 'حمص' }, locale: 'ar', overrideAccess: true })
    await p.create({ collection: 'cities', data: { slug: 'hama', name: 'حماة' }, locale: 'ar', overrideAccess: true })
  })

  const titles = async () => {
    const p = await payload()
    return (await p.find({ collection: 'dayTrips', limit: 100, sort: 'order', depth: 0 })).docs.map((d) => d.title)
  }

  it('adds trips only for cities that exist, once, after existing trips', async () => {
    const run = { db } as Parameters<typeof up>[0]
    await up(run)
    await up(run)
    expect(await titles()).toEqual(['قلعة الحصن', 'مشتى الحلو', 'دير مار جرجس الحميراء', 'أفاميا', 'قلعة مصياف', 'قلعة شيزر'])
  })

  it('removes exactly what it added on the way down', async () => {
    const p = await payload()
    const homs = (await p.find({ collection: 'cities', where: { slug: { equals: 'homs' } } })).docs[0]!
    await p.create({ collection: 'dayTrips', data: { fromCity: homs.id, title: 'مشوار أضافه محرر' }, overrideAccess: true })
    await down({ db } as Parameters<typeof down>[0])
    expect(await titles()).toEqual(['مشوار أضافه محرر'])
  })
})
