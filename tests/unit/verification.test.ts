import { describe, expect, it } from 'vitest'
import { stampOnPublish } from '@/hooks/stampOnPublish'
import { stampVerification } from '@/hooks/stampVerification'
import { httpsUrl } from '@/lib/validators'

describe('stampVerification', () => {
  const fixed = () => new Date('2026-10-17T09:30:00.000Z')
  const hook = stampVerification('verifiedBy', 'verifiedAt', fixed)
  const run = (data: Record<string, unknown>, user: { id: number } | null) => hook({ data, req: { user } } as never)

  it('overwrites whatever the client sent with the session user and server time', () => {
    expect(run({ value: 'x', verifiedBy: 99, verifiedAt: '2020-01-01' }, { id: 3 })).toEqual({
      value: 'x',
      verifiedBy: 3,
      verifiedAt: '2026-10-17T09:30:00.000Z',
    })
  })

  it('records no signer for system writes', () => {
    expect(run({}, null)).toMatchObject({ verifiedBy: null })
  })

  it('defaults to the real clock', () => {
    const out = stampVerification()({ data: {}, req: { user: { id: 1 } } } as never) as { verifiedAt: string }
    expect(Math.abs(Date.parse(out.verifiedAt) - Date.now())).toBeLessThan(5000)
  })
})

describe('stampOnPublish', () => {
  const fixed = () => new Date('2026-10-17T09:30:00.000Z')
  const hook = stampOnPublish('lastVerifiedBy', 'lastVerifiedAt', fixed)
  const run = (data: Record<string, unknown>, originalDoc?: Record<string, unknown>, user: { id: number } | null = { id: 2 }) =>
    hook({ data, originalDoc, req: { user } } as never)

  it('stamps on publish, discarding client values', () => {
    expect(run({ _status: 'published', lastVerifiedBy: 9, lastVerifiedAt: '2020-01-01' })).toMatchObject({
      lastVerifiedBy: 2,
      lastVerifiedAt: '2026-10-17T09:30:00.000Z',
    })
  })

  it('keeps the previous stamp on draft saves, discarding client values', () => {
    expect(
      run({ _status: 'draft', lastVerifiedBy: 9, lastVerifiedAt: '2099-01-01' }, { lastVerifiedBy: { id: 5 }, lastVerifiedAt: '2026-09-01T00:00:00.000Z' }),
    ).toMatchObject({ lastVerifiedBy: 5, lastVerifiedAt: '2026-09-01T00:00:00.000Z' })
    expect(run({ _status: 'draft' })).toMatchObject({ lastVerifiedBy: null, lastVerifiedAt: null })
  })

  it('records no signer for a system publish, and defaults to the real clock', () => {
    expect(run({ _status: 'published' }, undefined, null)).toMatchObject({ lastVerifiedBy: null })
    const out = stampOnPublish()({ data: { _status: 'published' }, req: { user: { id: 1 } } } as never) as { lastVerifiedAt: string }
    expect(Math.abs(Date.parse(out.lastVerifiedAt) - Date.now())).toBeLessThan(5000)
  })
})

describe('httpsUrl', () => {
  it('accepts empty values unless required', () => {
    expect(httpsUrl('')).toBe(true)
    expect(httpsUrl(undefined)).toBe(true)
    expect(httpsUrl('', { required: true })).toMatch(/مطلوب/)
  })

  it('accepts https URLs with a real host', () => {
    expect(httpsUrl('https://www.mofaex.gov.sy/visa')).toBe(true)
  })

  it('rejects http, junk, hostless URLs and non-strings', () => {
    expect(httpsUrl('http://example.com')).toMatch(/https/)
    expect(httpsUrl('javascript:alert(1)')).toMatch(/https/)
    expect(httpsUrl('https://localhost')).toMatch(/https/)
    expect(httpsUrl('not a url')).toMatch(/غير صالح/)
    expect(httpsUrl(42)).toMatch(/غير صالح/)
  })
})
