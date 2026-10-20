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

describe('a locked account answers like any wrong sign-in', () => {
  const restLogin = async (email: string, password: string) => {
    const { handleEndpoints } = await import('payload')
    const config = (await import('@payload-config')).default
    const request = new Request('http://localhost:3000/api/users/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const res = await handleEndpoints({ config, path: '/api/users/login', request })
    return { status: res.status, body: JSON.stringify(await res.json()) }
  }

  it('REST: a locked real address and an unknown address get the same status and body', async () => {
    const locked = await makeUser('correspondent')
    for (let i = 0; i < 5; i++) await restLogin(locked.email, 'wrong-password')
    const unknown = await restLogin('nobody-here@test.local', 'wrong-password')
    expect(await restLogin(locked.email, 'wrong-password')).toEqual(unknown)
    expect(await restLogin(locked.email, 'correct-horse-battery')).toEqual(unknown)
  })
})

describe('only the admin sets passwords (accounts get a random one from the admin)', () => {
  it('a correspondent or editor cannot change their own password, and the old one keeps working', async () => {
    const p = await payload()
    for (const user of [editor, other]) {
      await expect(p.update({ collection: 'users', id: user.id, data: { password: '123456' }, overrideAccess: false, user })).rejects.toThrow()
      const res = await p.login({ collection: 'users', data: { email: user.email, password: 'correct-horse-battery' } })
      expect(res.user?.id).toBe(user.id)
    }
  })

  it('the admin can set a password', async () => {
    const p = await payload()
    const c = await makeUser('correspondent')
    await p.update({ collection: 'users', id: c.id, data: { password: 'a-new-long-random-password' }, overrideAccess: false, user: admin })
    expect((await p.login({ collection: 'users', data: { email: c.email, password: 'a-new-long-random-password' } })).user?.id).toBe(c.id)
  })
})

describe('forgot-password is off (it logged the address, and only for accounts that exist)', () => {
  it('a real and an unknown address get the same refusal, and no reset token is made', async () => {
    const p = await payload()
    const c = await makeUser('correspondent')
    const ask = (email: string) =>
      p
        .forgotPassword({ collection: 'users', data: { email }, disableEmail: false })
        .then(() => 'sent')
        .catch((e: { status?: number; message?: string }) => `${e.status} ${e.message}`)
    const real = await ask(c.email)
    expect(real).toBe(await ask('nobody-at-all@test.local'))
    expect(real).not.toBe('sent')
    const after = await p.findByID({ collection: 'users', id: c.id, overrideAccess: true, showHiddenFields: true })
    expect((after as { resetPasswordToken?: string | null }).resetPasswordToken ?? null).toBeNull()
  })
})
