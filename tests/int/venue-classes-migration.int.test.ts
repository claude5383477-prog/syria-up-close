import { beforeAll, describe, expect, it } from 'vitest'
import { down, up } from '@/migrations/20261029_063705_venue_classes'
import { payload, resetWithAdmin } from './helpers'

type Db = Parameters<typeof up>[0]['db']

describe('migration 20261029_063705_venue_classes', () => {
  let db: Db
  let city: number

  beforeAll(async () => {
    await resetWithAdmin()
    const p = await payload()
    db = (p.db as unknown as { drizzle: Db }).drizzle
    city = (await p.create({ collection: 'cities', data: { slug: 'damascus', name: 'دمشق' }, locale: 'ar', overrideAccess: true })).id
  })

  it('gives places saved before the classes a default class on the way up', async () => {
    const p = await payload()
    const make = (kind: 'restaurant' | 'cafe' | 'park', name: string) =>
      p.create({ collection: 'venues', data: { city, kind, name, _status: 'published' }, locale: 'ar', overrideAccess: true })
    await down({ db } as Parameters<typeof down>[0])
    // Inserted while the columns do not exist: the collection's own fields are written without them.
    const pool = (p.db as unknown as { pool: { query: (q: string, v?: unknown[]) => Promise<unknown> } }).pool
    await pool.query(`insert into venues (city_id, kind, _status, updated_at, created_at) values ($1, 'cafe', 'published', now(), now()), ($1, 'restaurant', 'published', now(), now()), ($1, 'park', 'published', now(), now())`, [city])
    await up({ db } as Parameters<typeof up>[0])
    const rows = (await p.find({ collection: 'venues', depth: 0, sort: 'id', overrideAccess: true })).docs
    expect(rows.map((r) => [r.kind, r.category ?? null, r.subcategory ?? null])).toEqual([
      ['cafe', 'tourist', 'cafe'],
      ['restaurant', 'popular', null],
      ['park', null, null],
    ])
    // New places after the migration keep what the editor chose.
    const fresh = await make('restaurant', 'بيت جبري')
    const saved = await p.update({ collection: 'venues', id: fresh.id, data: { category: 'tourist', subcategory: 'arab-house' }, overrideAccess: true })
    expect([saved.category, saved.subcategory]).toEqual(['tourist', 'arab-house'])
  })

  it('refuses a section that does not belong to the chosen class', async () => {
    const p = await payload()
    await expect(
      p.create({ collection: 'venues', data: { city, kind: 'restaurant', name: 'x', category: 'tourist', subcategory: 'shawarma' }, locale: 'ar', overrideAccess: true }),
    ).rejects.toThrow()
  })
})
