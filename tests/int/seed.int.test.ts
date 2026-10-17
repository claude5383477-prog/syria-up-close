import { beforeAll, describe, expect, it } from 'vitest'
import { seed, type SeedEnv } from '@/seed/seed'
import { payload, resetDatabase } from './helpers'

const env = {
  SEED_ADMIN_EMAIL: 'admin@seed.local',
  SEED_ADMIN_PASSWORD: 'seed-admin-password',
  SEED_CORRESPONDENT_EMAIL: 'damascus@seed.local',
  SEED_CORRESPONDENT_PASSWORD: 'seed-correspondent-password',
} satisfies SeedEnv

const counts = async () => {
  const p = await payload()
  const n = async (collection: 'cities' | 'places' | 'dayTrips' | 'users' | 'media') => (await p.count({ collection })).totalDocs
  return { cities: await n('cities'), places: await n('places'), dayTrips: await n('dayTrips'), users: await n('users'), media: await n('media') }
}

beforeAll(resetDatabase)

describe('seed', () => {
  it('refuses to run without the account variables', async () => {
    const p = await payload()
    await expect(seed(p, { ...env, SEED_ADMIN_PASSWORD: '' })).rejects.toThrow(/SEED_ADMIN_PASSWORD/)
  })

  it('creates the four cities with prototype text in both languages', async () => {
    const p = await payload()
    await seed(p, env)
    expect(await counts()).toEqual({ cities: 4, places: 16, dayTrips: 6, users: 2, media: 0 })

    const ar = await p.find({ collection: 'cities', where: { slug: { equals: 'damascus' } }, locale: 'ar' })
    const en = await p.find({ collection: 'cities', where: { slug: { equals: 'damascus' } }, locale: 'en' })
    expect(ar.docs[0]?.name).toBe('دمشق')
    expect(en.docs[0]?.name).toBe('Damascus')
    expect(en.docs[0]?.eat).toMatch(/^Chickpea fatteh/)
  })

  it('creates the admin and a correspondent assigned to Damascus', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'users', sort: 'email', depth: 1 })
    const admin = docs.find((u) => u.email === env.SEED_ADMIN_EMAIL)
    const corr = docs.find((u) => u.email === env.SEED_CORRESPONDENT_EMAIL)
    expect(admin?.role).toBe('admin')
    expect(corr?.role).toBe('correspondent')
    expect(corr?.assignedCities?.map((c) => (typeof c === 'object' ? c.slug : c))).toEqual(['damascus'])
    await expect(p.login({ collection: 'users', data: { email: env.SEED_CORRESPONDENT_EMAIL, password: env.SEED_CORRESPONDENT_PASSWORD } })).resolves.toBeTruthy()
  })

  it('is safe to run again: nothing is duplicated', async () => {
    const p = await payload()
    const before = await counts()
    await seed(p, env)
    expect(await counts()).toEqual(before)
  })
})
