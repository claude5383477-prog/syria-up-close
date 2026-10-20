import { beforeAll, describe, expect, it } from 'vitest'
import type { City, User } from '@/payload-types'
import { makeUser, payload, resetWithAdmin } from './helpers'

// Version history follows the same rule as reading the document (security audit H1): without
// readVersions, Payload lets any signed-in user read every version, drafts included.

let editor: User
let corrDamascus: User
let corrAleppo: User
let damascus: City
let aleppo: City

const as = (user: User) => ({ user, overrideAccess: false, depth: 0 }) as const

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor')
  damascus = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق' } })
  aleppo = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'aleppo', name: 'حلب' } })
  corrDamascus = await makeUser('correspondent', { assignedCities: [damascus.id] })
  corrAleppo = await makeUser('correspondent', { assignedCities: [aleppo.id] })

  // Each correspondent's own unpublished report, as drafts (with version history).
  await p.create({ collection: 'seasonReports', draft: true, data: { title: 'مسودة دمشق', city: damascus.id, fieldDate: '2026-10-01T00:00:00.000Z' }, ...as(corrDamascus) })
  await p.create({ collection: 'seasonReports', draft: true, data: { title: 'مسودة حلب', city: aleppo.id, fieldDate: '2026-10-01T00:00:00.000Z' }, ...as(corrAleppo) })
  // Staff drafts that nobody else may see yet.
  await p.create({ collection: 'stories', draft: true, data: { title: 'قصة غير منشورة', slug: 'draft-story' }, ...as(editor) })
  await p.create({ collection: 'firstVisitPages', draft: true, data: { topic: 'money', title: 'المال (مسودة)' }, ...as(editor) })
  // A status item per city; each update keeps a version.
  for (const [corr, city, value] of [[corrDamascus, damascus.id, 'كهرباء دمشق'], [corrAleppo, aleppo.id, 'كهرباء حلب']] as const) {
    const item = await p.create({ collection: 'statusItems', data: { city, type: 'electricity', value }, ...as(corr) })
    await p.update({ collection: 'statusItems', id: item.id, data: { value: `${value} (محدّث)` }, ...as(corr) })
  }
})

const titles = (docs: { version: { title?: unknown } }[]) => docs.map((d) => d.version.title)

describe('version history follows the read rule', () => {
  it('a correspondent reads only the versions of their own season reports', async () => {
    const p = await payload()
    const mine = await p.findVersions({ collection: 'seasonReports', ...as(corrDamascus), limit: 100 })
    expect(titles(mine.docs)).toContain('مسودة دمشق')
    expect(titles(mine.docs)).not.toContain('مسودة حلب')
  })

  it("a correspondent cannot read staff drafts of stories or first-visit pages through their versions", async () => {
    const p = await payload()
    // Refused outright (staff only) or empty: either way nothing comes back.
    const none = { totalDocs: 0 }
    expect((await p.findVersions({ collection: 'stories', ...as(corrDamascus), limit: 100 }).catch(() => none)).totalDocs).toBe(0)
    expect((await p.findVersions({ collection: 'firstVisitPages', ...as(corrDamascus), limit: 100 }).catch(() => none)).totalDocs).toBe(0)
  })

  it("a correspondent reads status history of their own cities only", async () => {
    const p = await payload()
    const res = await p.findVersions({ collection: 'statusItems', ...as(corrDamascus), limit: 100 })
    const cities = new Set(res.docs.map((d) => (typeof d.version.city === 'object' ? d.version.city?.id : d.version.city)))
    expect(res.totalDocs).toBeGreaterThan(0)
    expect([...cities]).toEqual([damascus.id])
  })

  it('staff still read every version', async () => {
    const p = await payload()
    expect(titles((await p.findVersions({ collection: 'seasonReports', ...as(editor), limit: 100 })).docs)).toEqual(
      expect.arrayContaining(['مسودة دمشق', 'مسودة حلب']),
    )
    expect((await p.findVersions({ collection: 'stories', ...as(editor), limit: 100 })).totalDocs).toBeGreaterThan(0)
  })

  it('anonymous visitors read no version history', async () => {
    const p = await payload()
    for (const collection of ['seasonReports', 'stories', 'firstVisitPages', 'statusItems'] as const) {
      const res = await p.findVersions({ collection, overrideAccess: false, depth: 0, limit: 100 }).catch(() => ({ totalDocs: 0, docs: [] }))
      const drafts = res.docs.filter((d) => (d.version as { _status?: string })._status === 'draft')
      expect(drafts, collection).toHaveLength(0)
    }
  })

  it('a redacted detail of a published report stays out of reach: no visitor or other correspondent reads earlier published versions', async () => {
    const p = await payload()
    const report = await p.create({ collection: 'seasonReports', draft: true, data: { title: 'قرب دكان أبو سمير', city: damascus.id, fieldDate: '2026-10-02T00:00:00.000Z' }, ...as(corrDamascus) })
    await p.update({ collection: 'seasonReports', id: report.id, data: { _status: 'published' }, ...as(editor) })
    await p.update({ collection: 'seasonReports', id: report.id, data: { title: 'في السوق' }, ...as(editor) })
    const where = { parent: { equals: report.id } }
    const anon = await p.findVersions({ collection: 'seasonReports', where, overrideAccess: false, depth: 0, limit: 100 }).catch(() => ({ docs: [] }))
    expect(titles(anon.docs as never)).not.toContain('قرب دكان أبو سمير')
    const colleague = await p.findVersions({ collection: 'seasonReports', where, ...as(corrAleppo), limit: 100 })
    expect(titles(colleague.docs)).not.toContain('قرب دكان أبو سمير')
    for (const collection of ['stories', 'firstVisitPages'] as const) {
      const res = await p.findVersions({ collection, overrideAccess: false, depth: 0, limit: 100 }).catch(() => ({ totalDocs: 0 }))
      expect(res.totalDocs, collection).toBe(0)
    }
  })

  it('earlier text of a published story or first-visit page is staff only: visitors and correspondents are refused', async () => {
    const p = await payload()
    const story = await p.create({ collection: 'stories', data: { title: 'نص أول منشور', slug: 'published-story', _status: 'published' }, ...as(editor) })
    await p.update({ collection: 'stories', id: story.id, data: { title: 'نص مصحح' }, ...as(editor) })
    const page = await p.create({ collection: 'firstVisitPages', data: { topic: 'visa', title: 'التأشيرة (أول نص)', officialSourceUrl: 'https://example.org/visa', _status: 'published' }, ...as(editor) })
    await p.update({ collection: 'firstVisitPages', id: page.id, data: { title: 'التأشيرة' }, ...as(editor) })
    for (const collection of ['stories', 'firstVisitPages'] as const) {
      await expect(p.findVersions({ collection, overrideAccess: false, depth: 0 }), `${collection} visitor`).rejects.toMatchObject({ status: 403 })
      await expect(p.findVersions({ collection, ...as(corrDamascus) }), `${collection} correspondent`).rejects.toMatchObject({ status: 403 })
      expect((await p.findVersions({ collection, ...as(editor), limit: 100 })).totalDocs, `${collection} staff`).toBeGreaterThan(1)
    }
  })
})
