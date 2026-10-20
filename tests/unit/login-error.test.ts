import { APIError, LockedAuth } from 'payload'
import { describe, expect, it } from 'vitest'
import { hideLockedAccount } from '@/hooks/loginError'

const req = { t: (key: string) => key }
const run = (error: Error) => hideLockedAccount({ error, req, context: {}, collection: {} } as never)

describe('hideLockedAccount (users afterError)', () => {
  it('answers a locked account with the wrong-credentials message', () => {
    expect(run(new LockedAuth())).toEqual({ response: { errors: [{ message: 'error:emailOrPasswordIncorrect' }] }, status: 401 })
  })

  it('leaves every other error alone', () => {
    expect(run(new APIError('other', 400))).toBeUndefined()
  })
})
