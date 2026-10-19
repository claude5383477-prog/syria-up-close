import { beforeAll, describe, expect, it } from 'vitest'
import type { City, User } from '@/payload-types'
import { makeUser, payload, resetWithAdmin } from './helpers'

// Owner decision (2026-10-19): correspondents' real names are never published. What visitors see
// (status "verified by", report author, photo credit) is the display name; the real name stays in
// the admin for the admin only. An empty display name defaults to "مراسل سوريا عن قرب في {المدينة}".

let admin: User
let editor: User
let corr: User
let damascus: City

const as = (user: User) => ({ user, overrideAccess: false, depth: 0 }) as const

beforeAll(async () => {
  admin = await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor', { name: 'هالة المحررة', displayName: 'فريق التحرير' })
  damascus = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق' } })
  corr = await makeUser('correspondent', { name: 'الاسم الحقيقي السري', assignedCities: [damascus.id] })
})

describe('display names', () => {
  it("a correspondent without a display name gets the city default", () => {
    expect(corr.displayName).toBe('مراسل سوريا عن قرب في دمشق')
  })

  it('a chosen display name is kept', async () => {
    const p = await payload()
    const c = await makeUser('correspondent', { name: 'اسم آخر', displayName: 'عين على الشام', assignedCities: [damascus.id] })
    expect((await p.findByID({ collection: 'users', id: c.id, overrideAccess: true })).displayName).toBe('عين على الشام')
  })

  it('a correspondent with no city yet gets the generic default', async () => {
    const c = await makeUser('correspondent', { name: 'بلا مدينة' })
    expect(c.displayName).toBe('مراسل سوريا عن قرب')
  })

  it('status items, reports and photos publish the display name, never the real name', async () => {
    const p = await payload()
    const item = await p.create({ collection: 'statusItems', data: { city: damascus.id, type: 'internet', value: 'بطيء' }, ...as(corr) })
    expect(item.verifiedByName).toBe('مراسل سوريا عن قرب في دمشق')
    const report = await p.create({
      collection: 'seasonReports',
      draft: true,
      data: { title: 'تقرير', city: damascus.id, fieldDate: '2026-10-01T00:00:00.000Z' },
      ...as(corr),
    })
    expect(report.authorName).toBe('مراسل سوريا عن قرب في دمشق')
    const verified = await p.create({ collection: 'statusItems', data: { city: damascus.id, type: 'roads', value: 'سالكة' }, ...as(editor) })
    expect(verified.verifiedByName).toBe('فريق التحرير')
    expect(JSON.stringify([item, report, verified])).not.toContain('الاسم الحقيقي السري')
  })

  it('the real name is readable by the admin and the person only, not by editors', async () => {
    const p = await payload()
    const seenBy = async (user: User) => (await p.findByID({ collection: 'users', id: corr.id, ...as(user) })).name
    expect(await seenBy(admin)).toBe('الاسم الحقيقي السري')
    expect(await seenBy(corr)).toBe('الاسم الحقيقي السري')
    expect(await seenBy(editor)).toBeUndefined()
  })

  it("a correspondent's email (often their real name) is readable by the admin and the person only", async () => {
    const p = await payload()
    const seenBy = async (user: User) => (await p.findByID({ collection: 'users', id: corr.id, ...as(user) })).email
    expect(await seenBy(admin)).toBe(corr.email)
    expect(await seenBy(corr)).toBe(corr.email)
    expect(await seenBy(editor)).toBeUndefined()
    const listed = await p.find({ collection: 'users', where: { id: { equals: corr.id } }, ...as(editor) })
    expect(listed.docs[0]?.email).toBeUndefined()
  })

  it('signing in still works for a correspondent', async () => {
    const p = await payload()
    const res = await p.login({ collection: 'users', data: { email: corr.email, password: 'correct-horse-battery' } })
    expect(res.user?.id).toBe(corr.id)
  })

  describe('the default follows role and city changes', () => {
    it('staff demoted to correspondent: their own name is replaced by the city default', async () => {
      const p = await payload()
      const staff = await makeUser('editor', { name: 'اسم موظف حقيقي' })
      expect(staff.displayName).toBe('اسم موظف حقيقي')
      const demoted = await p.update({ collection: 'users', id: staff.id, data: { role: 'correspondent', assignedCities: [damascus.id] }, ...as(admin) })
      expect(demoted.displayName).toBe('مراسل سوريا عن قرب في دمشق')
    })

    it('a correspondent with the default name moved to another city gets that city’s default', async () => {
      const p = await payload()
      const aleppo = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'aleppo', name: 'حلب' } })
      const c = await makeUser('correspondent', { assignedCities: [damascus.id] })
      const moved = await p.update({ collection: 'users', id: c.id, data: { assignedCities: [aleppo.id] }, ...as(admin) })
      expect(moved.displayName).toBe('مراسل سوريا عن قرب في حلب')
    })

    it('a chosen display name survives a city change', async () => {
      const p = await payload()
      const c = await makeUser('correspondent', { displayName: 'عين على الشام', assignedCities: [damascus.id] })
      const { docs } = await p.find({ collection: 'cities', where: { slug: { equals: 'aleppo' } }, overrideAccess: true })
      const moved = await p.update({ collection: 'users', id: c.id, data: { assignedCities: [docs[0]!.id] }, ...as(admin) })
      expect(moved.displayName).toBe('عين على الشام')
    })

    it('clearing the field returns to the default', async () => {
      const p = await payload()
      const c = await makeUser('correspondent', { displayName: 'اسم مؤقت', assignedCities: [damascus.id] })
      const cleared = await p.update({ collection: 'users', id: c.id, data: { displayName: '' }, ...as(admin) })
      expect(cleared.displayName).toBe('مراسل سوريا عن قرب في دمشق')
    })
  })
})
