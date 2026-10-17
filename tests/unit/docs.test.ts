import { describe, expect, it } from 'vitest'
import { asDoc, asMedia, damascusDate } from '@/lib/docs'

describe('damascusDate', () => {
  it('returns the calendar day in Damascus (UTC+3), not UTC', () => {
    expect(damascusDate(new Date('2026-10-16T22:30:00Z'))).toBe('2026-10-17')
    expect(damascusDate(new Date('2026-10-17T10:00:00Z'))).toBe('2026-10-17')
  })

  it('defaults to now', () => {
    expect(damascusDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('asMedia / asDoc', () => {
  it('returns populated documents and null for bare ids or nothing', () => {
    const m = { id: 1, alt: 'x' } as never
    expect(asMedia(m)).toBe(m)
    expect(asMedia(5)).toBeNull()
    expect(asMedia(null)).toBeNull()
    expect(asDoc({ id: 2 })).toEqual({ id: 2 })
    expect(asDoc(undefined)).toBeNull()
  })
})
