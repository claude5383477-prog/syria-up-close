import { beforeAll, describe, expect, it } from 'vitest'
import { createCorrespondent } from '@/data/correspondents'
import { payload, resetWithAdmin } from './helpers'

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'aleppo', name: 'حلب' } })
})

describe('createCorrespondent', () => {
  it('creates a correspondent for one city, with the city default display name, who can sign in', async () => {
    const p = await payload()
    const made = await createCorrespondent(p, { email: 'north-desk@proton.me', name: 'اسم حقيقي سري', city: 'aleppo', password: 'a-long-random-password-for-tests' })
    expect(made).toMatchObject({ email: 'north-desk@proton.me', displayName: 'مراسل سوريا عن قرب في حلب', city: 'aleppo' })
    const user = await p.findByID({ collection: 'users', id: made.id, overrideAccess: true, depth: 0 })
    expect(user.role).toBe('correspondent')
    expect(user.assignedCities).toHaveLength(1)
    const login = await p.login({ collection: 'users', data: { email: 'north-desk@proton.me', password: 'a-long-random-password-for-tests' } })
    expect(login.user?.id).toBe(made.id)
  })

  it('refuses an unknown city and an address that already has an account', async () => {
    const p = await payload()
    await expect(createCorrespondent(p, { email: 'x1@proton.me', name: 'س', city: 'nowhere', password: 'a-long-random-password-for-tests' })).rejects.toThrow(/city/)
    await expect(createCorrespondent(p, { email: 'NORTH-DESK@proton.me', name: 'س', city: 'aleppo', password: 'a-long-random-password-for-tests' })).rejects.toThrow(/already/)
  })
})
