import { beforeAll, describe, expect, it } from 'vitest'
import type { City, User } from '@/payload-types'
import { makeUser, payload, resetWithAdmin } from './helpers'

let editor: User
let corr: User
let otherCorr: User
let damascus: City
let aleppo: City

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor')
  damascus = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق' } })
  aleppo = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'aleppo', name: 'حلب' } })
  corr = await makeUser('correspondent', { assignedCities: [damascus.id] })
  otherCorr = await makeUser('correspondent', { assignedCities: [damascus.id] })
})

const as = (user: User) => ({ user, overrideAccess: false, depth: 0 }) as const

describe('firstVisitPages', () => {
  it('a draft can be saved without a source', async () => {
    const p = await payload()
    const page = await p.create({ collection: 'firstVisitPages', data: { topic: 'visa', title: 'التأشيرة والدخول' }, draft: true, ...as(editor) })
    expect(page._status).toBe('draft')
    expect(page.lastVerifiedAt ?? null).toBeNull()
  })

  it('cannot be published without an official https source (Arabic message)', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'firstVisitPages', where: { topic: { equals: 'visa' } }, draft: true })
    const id = docs[0]!.id
    await expect(p.update({ collection: 'firstVisitPages', id, data: { _status: 'published' }, ...as(editor) })).rejects.toThrow(/المصدر|مطلوب/)
    const err = await p
      .update({ collection: 'firstVisitPages', id, data: { _status: 'published', officialSourceUrl: 'http://example.gov.sy' }, ...as(editor) })
      .then(() => null, (e: { data?: { errors?: { message: string }[] } }) => e)
    expect(err?.data?.errors?.[0]?.message).toMatch(/https/)
  })

  it('an editor publishes with a source; the server stamps who and when', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'firstVisitPages', where: { topic: { equals: 'visa' } }, draft: true })
    const published = await p.update({
      collection: 'firstVisitPages',
      id: docs[0]!.id,
      data: { _status: 'published', officialSourceUrl: 'https://www.mofaex.gov.sy', lastVerifiedAt: '2020-01-01T00:00:00.000Z' },
      ...as(editor),
    })
    expect(published._status).toBe('published')
    expect(published.lastVerifiedBy).toBe(editor.id)
    expect(new Date(published.lastVerifiedAt!).getFullYear()).toBeGreaterThan(2020)
  })

  it('a correspondent can read but not create, edit or publish', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'firstVisitPages', ...as(corr) })
    expect(docs.length).toBe(1)
    await expect(p.create({ collection: 'firstVisitPages', data: { topic: 'money', title: 'x' }, draft: true, ...as(corr) })).rejects.toThrow()
    await expect(p.update({ collection: 'firstVisitPages', id: docs[0]!.id, data: { title: 'x' }, draft: true, ...as(corr) })).rejects.toThrow()
  })

  it('visitors never see drafts', async () => {
    const p = await payload()
    await p.create({ collection: 'firstVisitPages', data: { topic: 'money', title: 'المال' }, draft: true, ...as(editor) })
    const { docs } = await p.find({ collection: 'firstVisitPages', overrideAccess: false })
    expect(docs.map((d) => d.topic)).toEqual(['visa'])
  })
})

describe('seasonReports', () => {
  it('a correspondent submits a draft for their city; author and slug are set by the server', async () => {
    const p = await payload()
    const r = await p.create({
      collection: 'seasonReports',
      data: { title: 'أول ثلج', city: damascus.id, fieldDate: '2026-12-01T00:00:00.000Z', author: editor.id },
      draft: true,
      ...as(corr),
    })
    expect(r._status).toBe('draft')
    expect(r.author).toBe(corr.id)
    expect(r.slug).toBe('damascus-2026-12-01')
    const again = await p.create({
      collection: 'seasonReports',
      data: { title: 'ثلج تاني', city: damascus.id, fieldDate: '2026-12-01T00:00:00.000Z' },
      draft: true,
      ...as(corr),
    })
    expect(again.slug).toBe('damascus-2026-12-01-2')
  })

  it('a correspondent cannot publish, nor write for another city', async () => {
    const p = await payload()
    await expect(
      p.create({ collection: 'seasonReports', data: { title: 'x', city: damascus.id, fieldDate: '2026-12-02', _status: 'published' }, ...as(corr) }),
    ).rejects.toThrow()
    await expect(
      p.create({ collection: 'seasonReports', data: { title: 'x', city: aleppo.id, fieldDate: '2026-12-02' }, draft: true, ...as(corr) }),
    ).rejects.toThrow()
    const { docs } = await p.find({ collection: 'seasonReports', where: { author: { equals: corr.id } }, draft: true, limit: 1 })
    await expect(p.update({ collection: 'seasonReports', id: docs[0]!.id, data: { _status: 'published' }, ...as(corr) })).rejects.toThrow()
  })

  it('a correspondent who sends no status at all still only creates a draft', async () => {
    const p = await payload()
    const r = await p.create({
      collection: 'seasonReports',
      data: { title: 'بلا حالة', city: damascus.id, fieldDate: '2026-12-03T00:00:00.000Z' },
      ...as(corr),
    })
    expect(r._status).toBe('draft')
    expect((await p.find({ collection: 'seasonReports', overrideAccess: false, where: { id: { equals: r.id } } })).totalDocs).toBe(0)
    await p.delete({ collection: 'seasonReports', id: r.id, overrideAccess: true })
  })

  it('a correspondent edits their own draft but not someone else’s', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'seasonReports', where: { author: { equals: corr.id } }, draft: true, limit: 1 })
    const mine = await p.update({ collection: 'seasonReports', id: docs[0]!.id, data: { title: 'أول ثلج ببلودان' }, draft: true, ...as(corr) })
    expect(mine.title).toBe('أول ثلج ببلودان')
    await expect(
      p.update({ collection: 'seasonReports', id: docs[0]!.id, data: { title: 'hijack' }, draft: true, ...as(otherCorr) }),
    ).rejects.toThrow()
  })

  it('an editor publishes; then the correspondent can no longer edit it', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'seasonReports', where: { author: { equals: corr.id } }, draft: true, limit: 1 })
    const id = docs[0]!.id
    const pub = await p.update({ collection: 'seasonReports', id, data: { _status: 'published' }, ...as(editor) })
    expect(pub._status).toBe('published')
    expect(pub.author).toBe(corr.id)
    await expect(p.update({ collection: 'seasonReports', id, data: { title: 'late edit' }, draft: true, ...as(corr) })).rejects.toThrow()
  })

  it('visitors see only published reports; correspondents also see their own drafts', async () => {
    const p = await payload()
    const pub = await p.find({ collection: 'seasonReports', overrideAccess: false })
    expect(pub.docs.every((d) => d._status === 'published')).toBe(true)
    expect(pub.totalDocs).toBe(1)
    const own = await p.find({ collection: 'seasonReports', draft: true, ...as(corr) })
    expect(own.totalDocs).toBe(2)
    const other = await p.find({ collection: 'seasonReports', draft: true, ...as(otherCorr) })
    expect(other.totalDocs).toBe(1)
  })
})
