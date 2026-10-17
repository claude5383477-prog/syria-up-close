import { beforeAll, describe, expect, it } from 'vitest'
import { makeUser, payload, resetDatabase } from './helpers'

beforeAll(resetDatabase)

describe('users', () => {
  it('the first account ever created becomes admin, whatever role was asked for', async () => {
    const p = await payload()
    const first = await p.create({
      collection: 'users',
      data: { name: 'Founder', email: 'founder@test.local', password: 'correct-horse-battery', role: 'correspondent' },
    })
    expect(first.role).toBe('admin')

    const second = await p.create({
      collection: 'users',
      overrideAccess: true,
      data: { name: 'Second', email: 'second@test.local', password: 'correct-horse-battery', role: 'correspondent' },
    })
    expect(second.role).toBe('correspondent')
  })

  it('only an admin can create accounts', async () => {
    const p = await payload()
    const admin = await makeUser('admin')
    const editor = await makeUser('editor')
    const data = { name: 'New', email: 'new@test.local', password: 'correct-horse-battery', role: 'correspondent' as const }

    await expect(p.create({ collection: 'users', data, user: editor, overrideAccess: false })).rejects.toThrow()
    const created = await p.create({ collection: 'users', data, user: admin, overrideAccess: false })
    expect(created.role).toBe('correspondent')
  })

  it('a correspondent can rename themselves but cannot promote themselves', async () => {
    const p = await payload()
    const c = await makeUser('correspondent')
    const updated = await p.update({
      collection: 'users',
      id: c.id,
      data: { name: 'Renamed', role: 'admin' },
      user: c,
      overrideAccess: false,
    })
    expect(updated.name).toBe('Renamed')
    expect(updated.role).toBe('correspondent')
  })

  it('a correspondent cannot edit someone else', async () => {
    const p = await payload()
    const c = await makeUser('correspondent')
    const other = await makeUser('correspondent')
    await expect(
      p.update({ collection: 'users', id: other.id, data: { name: 'Hijacked' }, user: c, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('a correspondent only sees their own account; staff see the team', async () => {
    const p = await payload()
    const c = await makeUser('correspondent')
    const editor = await makeUser('editor')
    const own = await p.find({ collection: 'users', user: c, overrideAccess: false, limit: 100 })
    expect(own.docs.map((d) => d.id)).toEqual([c.id])
    const team = await p.find({ collection: 'users', user: editor, overrideAccess: false, limit: 100 })
    expect(team.totalDocs).toBeGreaterThan(1)
  })

  it('an admin can change roles', async () => {
    const p = await payload()
    const admin = await makeUser('admin')
    const c = await makeUser('correspondent')
    const promoted = await p.update({ collection: 'users', id: c.id, data: { role: 'editor' }, user: admin, overrideAccess: false })
    expect(promoted.role).toBe('editor')
  })

  it('locks the account after 5 wrong passwords', async () => {
    const p = await payload()
    const c = await makeUser('correspondent')
    for (let i = 0; i < 5; i++) {
      await expect(p.login({ collection: 'users', data: { email: c.email, password: 'wrong' } })).rejects.toThrow()
    }
    await expect(
      p.login({ collection: 'users', data: { email: c.email, password: 'correct-horse-battery' } }),
    ).rejects.toThrow(/قفل|locked/i) // admin language is Arabic, so the message is too
  })
})
