import { describe, expect, it } from 'vitest'
import { databaseEndpoint, migrationUrl } from '@/lib/neon'

const pooled = 'postgresql://u:p@ep-cool-river-a1b2c3-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'
const direct = 'postgresql://u:p@ep-cool-river-a1b2c3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
const otherBranch = 'postgresql://u:p@ep-quiet-lake-d4e5f6.eu-central-1.aws.neon.tech/neondb?sslmode=require'

describe('databaseEndpoint', () => {
  it('names the Neon branch endpoint, the same for pooled and direct strings', () => {
    expect(databaseEndpoint(pooled)).toBe('ep-cool-river-a1b2c3')
    expect(databaseEndpoint(direct)).toBe('ep-cool-river-a1b2c3')
  })

  it('is host and port for any other Postgres', () => {
    expect(databaseEndpoint('postgres://syria:x@localhost:54329/syria_dev')).toBe('localhost:54329')
  })
})

describe('migrationUrl', () => {
  it('uses the direct connection when it points at the same branch as the site', () => {
    expect(migrationUrl({ DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: direct })).toBe(direct)
  })

  it('falls back to DATABASE_URL when no direct string is set (local, Docker)', () => {
    expect(migrationUrl({ DATABASE_URL: direct })).toBe(direct)
  })

  it('refuses to migrate one branch while the site reads another', () => {
    expect(() => migrationUrl({ DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: otherBranch })).toThrow(/different databases/)
  })

  it('refuses to run without a database', () => {
    expect(() => migrationUrl({})).toThrow(/DATABASE_URL/)
  })
})
