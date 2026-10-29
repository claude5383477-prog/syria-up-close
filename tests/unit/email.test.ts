import { describe, expect, it } from 'vitest'
import { emailChoice } from '@/lib/email'

describe('emailChoice', () => {
  it('prefers Resend, then SMTP, else none', () => {
    expect(emailChoice({ RESEND_API_KEY: 're_x', SMTP_HOST: 'smtp.x', EMAIL_FROM: 'a@b.co' })).toMatchObject({ kind: 'resend', apiKey: 're_x', from: 'a@b.co' })
    expect(emailChoice({ SMTP_HOST: 'smtp.x', SMTP_PORT: '465', SMTP_USER: 'u', SMTP_PASS: 'p' })).toMatchObject({ kind: 'smtp', port: 465, secure: true, user: 'u', from: 'bookings@upclosesyria.com' })
    expect(emailChoice({ SMTP_HOST: 'smtp.x' })).toMatchObject({ kind: 'smtp', port: 587, secure: false, user: undefined })
    expect(emailChoice({})).toEqual({ kind: 'none' })
  })
})
