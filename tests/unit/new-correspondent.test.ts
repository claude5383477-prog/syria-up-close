import { describe, expect, it } from 'vitest'
import { checkAliasEmail, generatePassword } from '@/lib/new-correspondent'

describe('generatePassword', () => {
  it('is long, URL-safe and different every time', () => {
    const a = generatePassword()
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(generatePassword()).not.toBe(a)
  })
})

describe('checkAliasEmail (an alias that does not carry the real name)', () => {
  it('accepts an alias', () => {
    expect(checkAliasEmail('damascus.reports.7@proton.me', 'Ahmad Khalil')).toBeNull()
    expect(checkAliasEmail('sham-eye@proton.me', 'أحمد خليل')).toBeNull()
  })

  it('refuses an address that is not an email', () => {
    expect(checkAliasEmail('not-an-email', 'x')).toMatch(/email/)
  })

  it('refuses an address that contains a Latin part of the real name (3+ letters), any case or separator', () => {
    expect(checkAliasEmail('Ahmad.K@gmail.com', 'Ahmad Khalil')).toMatch(/ahmad/)
    expect(checkAliasEmail('a_khalil90@gmail.com', 'Ahmad Khalil')).toMatch(/khalil/)
    expect(checkAliasEmail('al-shami@x.org', 'Al Shami')).toMatch(/shami/)
  })

  it('checks the domain too (a family domain carries the name)', () => {
    expect(checkAliasEmail('a@khalil-family.net', 'Ahmad Khalil')).toMatch(/khalil/)
    expect(checkAliasEmail('desk@proton.me', 'Ahmad Khalil')).toBeNull()
  })
})
