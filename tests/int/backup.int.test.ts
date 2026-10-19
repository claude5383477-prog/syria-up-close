import pg from 'pg'
import { beforeAll, describe, expect, it } from 'vitest'
import { dumpDatabase, restoreDatabase, rowCounts, type Dump } from '@/data/backup'
import { makeUser, payload, resetWithAdmin } from './helpers'

// T34: a logical backup (every public table as rows, plus the applied migrations) restores into a
// migrated database with the same rows and working id sequences. Version-independent: production is
// Postgres 18, local tools are 17, so pg_dump cannot be used against it.

let dump: Dump
const client = () => new pg.Client({ connectionString: process.env.DATABASE_URL })

async function withClient<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = client()
  await c.connect()
  try {
    return await fn(c)
  } finally {
    await c.end()
  }
}

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  const damascus = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق', lede: 'حارات ضيقة.' } })
  await p.update({ collection: 'cities', id: damascus.id, overrideAccess: true, locale: 'en', data: { name: 'Damascus' } })
  const corr = await makeUser('correspondent', { assignedCities: [damascus.id] })
  await p.create({ collection: 'statusItems', data: { city: damascus.id, type: 'electricity', value: 'ساعتان وصل' }, user: corr, overrideAccess: false })
  dump = await withClient((c) => dumpDatabase(c, 'test'))
})

describe('logical backup and restore', () => {
  it('records the applied migrations and every public table', () => {
    expect(dump.version).toBe(1)
    expect(dump.migrations.length).toBeGreaterThan(0)
    expect(Object.keys(dump.tables)).toEqual(expect.arrayContaining(['users', 'cities', 'cities_locales', 'status_items', 'audit_log']))
    expect(dump.tables.payload_migrations).toBeUndefined()
  })

  it('restores the same rows over a changed database, and new rows still get fresh ids', async () => {
    const p = await payload()
    const before = await withClient(rowCounts)
    // Damage: rename the city, delete its status item, add another city.
    const { docs } = await p.find({ collection: 'cities', where: { slug: { equals: 'damascus' } }, overrideAccess: true })
    await p.update({ collection: 'cities', id: docs[0]!.id, overrideAccess: true, data: { name: 'اسم خاطئ' } })
    await p.delete({ collection: 'statusItems', where: { city: { equals: docs[0]!.id } }, overrideAccess: true })
    await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'aleppo', name: 'حلب' } })

    await withClient((c) => restoreDatabase(c, dump))

    expect(await withClient(rowCounts)).toEqual(before)
    const restored = await p.find({ collection: 'cities', locale: 'all', overrideAccess: true, depth: 0 })
    expect(restored.docs.map((d) => d.slug)).toEqual(['damascus'])
    expect(restored.docs[0]!.name).toEqual({ ar: 'دمشق', en: 'Damascus' })
    const fresh = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'homs', name: 'حمص' } })
    expect(fresh.id).toBeGreaterThan(restored.docs[0]!.id)
  })

  it('refuses a backup taken with a different set of migrations', async () => {
    const other: Dump = { ...dump, migrations: [...dump.migrations, '29991231_000000_future'] }
    await expect(withClient((c) => restoreDatabase(c, other))).rejects.toThrow(/migrations/)
  })
})
