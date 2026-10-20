import { beforeAll, describe, expect, it } from 'vitest'
import type { User } from '@/payload-types'
import { makeUser, payload, resetWithAdmin } from './helpers'

// Whether an email address belongs to a correspondent is itself sensitive: an editor or a
// compromised account must not be able to test addresses against the user list.

let admin: User
let editor: User
let corr: User
let other: User

beforeAll(async () => {
  admin = await resetWithAdmin()
  editor = await makeUser('editor')
  corr = await makeUser('correspondent')
  other = await makeUser('correspondent')
})

describe('unlock is for the admin only', () => {
  const unlock = async (user: User, email: string) =>
    (await payload())
      .unlock({ collection: 'users', data: { email } as never, overrideAccess: false, req: { user } })
      .then(() => 'ok' as const)
      .catch((e: { status?: number }) => e.status)

  it('editors and correspondents get the same refusal for a real and an unknown address', async () => {
    for (const user of [editor, corr]) {
      expect(await unlock(user, other.email)).toBe(403)
      expect(await unlock(user, 'nobody@test.local')).toBe(403)
    }
  })

  it('an unlock attempt by another user does not reset the failed-login count', async () => {
    const p = await payload()
    await p.login({ collection: 'users', data: { email: other.email, password: 'wrong-password' } }).catch(() => null)
    await unlock(corr, other.email)
    const after = await p.findByID({ collection: 'users', id: other.id, overrideAccess: true, showHiddenFields: true })
    expect((after as { loginAttempts?: number }).loginAttempts).toBe(1)
  })

  it('the admin can still unlock an account', async () => {
    expect(await unlock(admin, other.email)).toBe('ok')
  })
})

describe('an account cannot test addresses by changing its own email', () => {
  const tryEmail = async (user: User, email: string) =>
    (await payload())
      .update({ collection: 'users', id: user.id, data: { email }, overrideAccess: false, user, depth: 0 })
      .then(() => 'saved')
      .catch((e: Error) => e.message)

  it('a taken and a free address get the same answer, and the email stays as it was', async () => {
    for (const user of [editor, corr]) {
      expect(await tryEmail(user, other.email)).toBe(await tryEmail(user, `free-${user.id}@test.local`))
      const after = await (await payload()).findByID({ collection: 'users', id: user.id, overrideAccess: true })
      expect(after.email).toBe(user.email)
    }
  })

  it('the admin can still change an address', async () => {
    const p = await payload()
    const updated = await p.update({ collection: 'users', id: corr.id, data: { email: 'renamed@test.local' }, overrideAccess: false, user: admin })
    expect(updated.email).toBe('renamed@test.local')
  })
})
