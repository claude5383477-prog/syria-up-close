import { beforeAll, describe, expect, it } from 'vitest'
import type { City, User } from '@/payload-types'
import { makeUser, payload, resetWithAdmin } from './helpers'

let admin: User
let editor: User
let corr: User
let damascus: City

beforeAll(async () => {
  admin = await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor')
  damascus = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق' } })
  corr = await makeUser('correspondent', { assignedCities: [damascus.id] })
})

const as = (user: User) => ({ user, overrideAccess: false, depth: 0 }) as const

describe('siteSettings', () => {
  it('ships with the approved defaults, readable by visitors', async () => {
    const p = await payload()
    const ar = await p.findGlobal({ slug: 'siteSettings', overrideAccess: false, locale: 'ar' })
    expect(ar).toMatchObject({
      ahleenBaseUrl: 'https://ahleenbooking.com',
      partnerLinkRel: 'sponsored noopener',
      staleness: { statusDays: 7, firstVisitDays: 30 },
    })
    expect(ar.disclosureText).toBe('أهلين شريك هذا الدليل.')
    const en = await p.findGlobal({ slug: 'siteSettings', overrideAccess: false, locale: 'en' })
    expect(en.disclosureText).toBe('Ahleen is this guide’s partner.')
  })

  it('only an admin can change it, and rel must keep noopener', async () => {
    const p = await payload()
    await expect(p.updateGlobal({ slug: 'siteSettings', data: { staleness: { statusDays: 3, firstVisitDays: 30 } }, ...as(editor) })).rejects.toThrow()
    await expect(p.updateGlobal({ slug: 'siteSettings', data: { partnerLinkRel: 'sponsored' }, ...as(admin) })).rejects.toThrow()
    const ok = await p.updateGlobal({ slug: 'siteSettings', data: { staleness: { statusDays: 5, firstVisitDays: 30 } }, ...as(admin) })
    expect(ok.staleness?.statusDays).toBe(5)
  })
})

describe('stays, dailyDetail, stories', () => {
  it('correspondents cannot write them', async () => {
    const p = await payload()
    await expect(
      p.create({ collection: 'stays', data: { city: damascus.id, title: 'x', ahleenUrl: 'https://ahleenbooking.com/x' }, ...as(corr) }),
    ).rejects.toThrow()
    await expect(p.create({ collection: 'dailyDetail', data: { date: '2026-10-17', sentence: 'x' }, ...as(corr) })).rejects.toThrow()
    await expect(p.create({ collection: 'stories', data: { title: 'x', slug: 'x' }, draft: true, ...as(corr) })).rejects.toThrow()
  })

  it('a stay needs an https booking link', async () => {
    const p = await payload()
    await expect(
      p.create({ collection: 'stays', data: { city: damascus.id, title: 'بيت', ahleenUrl: 'http://ahleenbooking.com' }, ...as(editor) }),
    ).rejects.toThrow()
    const s = await p.create({ collection: 'stays', data: { city: damascus.id, title: 'بيت', ahleenUrl: 'https://ahleenbooking.com/s/1' }, ...as(editor) })
    expect(s.title).toBe('بيت')
  })

  it('one daily detail per day', async () => {
    const p = await payload()
    await p.create({ collection: 'dailyDetail', data: { date: '2026-10-17T00:00:00.000Z', sentence: 'جملة' }, ...as(editor) })
    await expect(
      p.create({ collection: 'dailyDetail', data: { date: '2026-10-17T00:00:00.000Z', sentence: 'أخرى' }, ...as(editor) }),
    ).rejects.toThrow()
  })

  it('story drafts are hidden from visitors', async () => {
    const p = await payload()
    await p.create({ collection: 'stories', data: { title: 'قصة', slug: 'story-1' }, draft: true, ...as(editor) })
    expect((await p.find({ collection: 'stories', overrideAccess: false })).totalDocs).toBe(0)
    expect((await p.find({ collection: 'stories', draft: true, ...as(editor) })).totalDocs).toBe(1)
  })
})
