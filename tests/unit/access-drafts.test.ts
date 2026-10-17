import { describe, expect, it } from 'vitest'
import { cannotPublish, publishedOnly, publishedOrOwn, publishedOrStaff, type AppUser } from '@/access'

const admin: AppUser = { id: 1, role: 'admin' }
const editor: AppUser = { id: 2, role: 'editor' }
const corr: AppUser = { id: 3, role: 'correspondent', assignedCities: [10] }
const as = (user: AppUser | null, data?: Record<string, unknown>) => ({ req: { user }, data }) as never
const PUBLISHED = { _status: { equals: 'published' } }

describe('publishedOrStaff', () => {
  it('staff read everything, everyone else only published documents', () => {
    expect(publishedOrStaff(as(admin))).toBe(true)
    expect(publishedOrStaff(as(editor))).toBe(true)
    expect(publishedOrStaff(as(corr))).toEqual(PUBLISHED)
    expect(publishedOrStaff(as(null))).toEqual(PUBLISHED)
  })
})

describe('publishedOnly', () => {
  it('is the public filter regardless of who asks', () => {
    expect(publishedOnly(as(null))).toEqual(PUBLISHED)
  })
})

describe('publishedOrOwn', () => {
  const read = publishedOrOwn('author')
  it('staff read everything; correspondents read published plus their own; visitors only published', () => {
    expect(read(as(editor))).toBe(true)
    expect(read(as(corr))).toEqual({ or: [PUBLISHED, { author: { equals: 3 } }] })
    expect(read(as(null))).toEqual(PUBLISHED)
  })
})

describe('cannotPublish', () => {
  const guarded = cannotPublish(() => true)

  it('lets staff publish', () => {
    expect(guarded(as(editor, { _status: 'published' }))).toBe(true)
    expect(guarded(as(admin, { _status: 'published' }))).toBe(true)
  })

  it('stops a correspondent from publishing but defers to the wrapped rule for drafts', () => {
    expect(guarded(as(corr, { _status: 'published' }))).toBe(false)
    expect(guarded(as(corr, { _status: 'draft' }))).toBe(true)
    expect(guarded(as(corr, {}))).toBe(true)
    expect(cannotPublish(() => false)(as(corr, { _status: 'draft' }))).toBe(false)
  })

  it('passes a Where result through untouched', () => {
    const where = { author: { equals: 3 } }
    expect(cannotPublish(() => where)(as(corr, { _status: 'draft' }))).toBe(where)
  })
})
