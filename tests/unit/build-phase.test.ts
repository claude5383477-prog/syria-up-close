import { describe, expect, it } from 'vitest'
import { buildWithoutDatabase } from '@/lib/build-phase'
import { secretMatches } from '@/lib/secret'

describe('buildWithoutDatabase', () => {
  it('is on only during `next build` with BUILD_WITHOUT_DB=1', () => {
    expect(buildWithoutDatabase({ BUILD_WITHOUT_DB: '1', NEXT_PHASE: 'phase-production-build' })).toBe(true)
  })

  it('never at runtime, even if the flag leaks into the container environment', () => {
    expect(buildWithoutDatabase({ BUILD_WITHOUT_DB: '1', NEXT_PHASE: 'phase-production-server' })).toBe(false)
    expect(buildWithoutDatabase({ BUILD_WITHOUT_DB: '1' })).toBe(false)
  })

  it('not for a normal build that has a database', () => {
    expect(buildWithoutDatabase({ NEXT_PHASE: 'phase-production-build' })).toBe(false)
    expect(buildWithoutDatabase({ BUILD_WITHOUT_DB: 'true', NEXT_PHASE: 'phase-production-build' })).toBe(false)
  })
})

describe('secretMatches', () => {
  it('accepts the exact secret', () => {
    expect(secretMatches('s3cret-value', 's3cret-value')).toBe(true)
  })

  it('refuses a wrong, shorter, longer or missing value', () => {
    expect(secretMatches('s3cret-valuf', 's3cret-value')).toBe(false)
    expect(secretMatches('s3cret', 's3cret-value')).toBe(false)
    expect(secretMatches('s3cret-value-x', 's3cret-value')).toBe(false)
    expect(secretMatches(null, 's3cret-value')).toBe(false)
    expect(secretMatches(undefined, 's3cret-value')).toBe(false)
  })

  it('refuses everything when no secret is configured', () => {
    expect(secretMatches('', '')).toBe(false)
    expect(secretMatches('anything', undefined)).toBe(false)
  })
})
