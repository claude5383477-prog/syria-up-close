import { describe, expect, it } from 'vitest'
import { freshness } from '@/lib/freshness'

const DAY = 86_400_000
const now = new Date('2026-10-17T12:00:00Z')
const ago = (ms: number) => new Date(now.getTime() - ms)

describe('freshness', () => {
  it('is pending when nothing has been verified yet', () => {
    expect(freshness(null, now, 7)).toBe('pending')
    expect(freshness(undefined, now, 7)).toBe('pending')
  })

  it('is pending for an unparseable date rather than inventing a state', () => {
    expect(freshness('not-a-date', now, 7)).toBe('pending')
  })

  it('is fresh when verified just now', () => {
    expect(freshness(now, now, 7)).toBe('fresh')
  })

  it('is fresh at exactly the limit', () => {
    expect(freshness(ago(7 * DAY), now, 7)).toBe('fresh')
  })

  it('is stale one millisecond past the limit', () => {
    expect(freshness(ago(7 * DAY + 1), now, 7)).toBe('stale')
  })

  it('treats a future timestamp (clock skew) as fresh', () => {
    expect(freshness(new Date(now.getTime() + DAY), now, 7)).toBe('fresh')
  })

  it('accepts ISO strings as stored by the CMS', () => {
    expect(freshness(ago(8 * DAY).toISOString(), now, 7)).toBe('stale')
    expect(freshness(ago(29 * DAY).toISOString(), now, 30)).toBe('fresh')
  })

  it('rejects a non-positive or non-finite limit', () => {
    expect(() => freshness(now, now, 0)).toThrow(RangeError)
    expect(() => freshness(now, now, -1)).toThrow(RangeError)
    expect(() => freshness(now, now, Number.NaN)).toThrow(RangeError)
  })
})
