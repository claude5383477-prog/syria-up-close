import { describe, expect, it } from 'vitest'
import { passwordRules } from '@/hooks/passwordRules'

const run = (operation: string, user: unknown, data: Record<string, unknown> = {}, overrideAccess = false) => {
  const args = { data, overrideAccess }
  return () => passwordRules({ args, operation, req: { user } } as never)
}

describe('passwordRules (users beforeOperation)', () => {
  it('refuses a password set by anyone but the admin', () => {
    expect(run('update', { role: 'correspondent' }, { password: 'x' })).toThrow(/المدير/)
    expect(run('update', { role: 'editor' }, { password: 'x' })).toThrow(/المدير/)
  })

  it('lets the admin, server code, and updates without a password through', () => {
    expect(run('update', { role: 'admin' }, { password: 'x' })()).toEqual({ data: { password: 'x' }, overrideAccess: false })
    expect(run('update', null, { password: 'x' }, true)()).toBeTruthy()
    expect(run('update', { role: 'correspondent' }, { displayName: 'y' })()).toBeTruthy()
  })

  it('turns forgot-password off for everyone', () => {
    expect(run('forgotPassword', null, { email: 'a@b.c' })).toThrow()
    expect(run('resetPassword', null, { token: 't', password: 'p' })).toThrow()
  })
})
