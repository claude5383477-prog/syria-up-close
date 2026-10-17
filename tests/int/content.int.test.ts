import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import type { City, User } from '@/payload-types'
import { makeUser, payload, resetDatabase } from './helpers'

let editor: User
let correspondent: User
let otherCorrespondent: User
let damascus: City

async function png(): Promise<{ data: Buffer; mimetype: string; name: string; size: number }> {
  // Wider than the largest size (1600) so every derived size is generated.
  const data = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#0B4836' } }).png().toBuffer()
  return { data, mimetype: 'image/png', name: 'test.png', size: data.length }
}

beforeAll(async () => {
  await resetDatabase()
  const p = await payload()
  editor = await makeUser('editor')
  damascus = await p.create({
    collection: 'cities',
    overrideAccess: true,
    data: { slug: 'damascus', name: 'دمشق', tag: 'المدينة القديمة', lede: 'حارات ضيقة.', eat: 'فتة' },
  })
  correspondent = await makeUser('correspondent', { assignedCities: [damascus.id] })
  otherCorrespondent = await makeUser('correspondent', { assignedCities: [damascus.id] })
})

describe('cities, places, dayTrips', () => {
  it('anyone, including visitors, can read them', async () => {
    const p = await payload()
    const res = await p.find({ collection: 'cities', overrideAccess: false })
    expect(res.docs.map((c) => c.slug)).toContain('damascus')
  })

  it('a correspondent cannot create or edit them', async () => {
    const p = await payload()
    const as = { user: correspondent, overrideAccess: false } as const
    await expect(p.create({ collection: 'cities', data: { slug: 'x', name: 'x' }, ...as })).rejects.toThrow()
    await expect(p.update({ collection: 'cities', id: damascus.id, data: { tag: 'changed' }, ...as })).rejects.toThrow()
    await expect(p.create({ collection: 'places', data: { city: damascus.id, title: 'x' }, ...as })).rejects.toThrow()
    await expect(p.create({ collection: 'dayTrips', data: { fromCity: damascus.id, title: 'x' }, ...as })).rejects.toThrow()
  })

  it('an editor can', async () => {
    const p = await payload()
    const as = { user: editor, overrideAccess: false } as const
    const place = await p.create({ collection: 'places', data: { city: damascus.id, title: 'الجامع الأموي', order: 1 }, ...as })
    expect(place.title).toBe('الجامع الأموي')
    const trip = await p.create({ collection: 'dayTrips', data: { fromCity: damascus.id, title: 'معلولا', order: 1 }, ...as })
    expect(trip.title).toBe('معلولا')
  })

  it('city slugs are unique', async () => {
    const p = await payload()
    await expect(
      p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'again' } }),
    ).rejects.toThrow()
  })

  it('a correspondent cannot assign themselves another city', async () => {
    const p = await payload()
    const aleppo = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'aleppo', name: 'حلب' } })
    const updated = await p.update({
      collection: 'users',
      id: correspondent.id,
      data: { assignedCities: [damascus.id, aleppo.id] },
      user: correspondent,
      overrideAccess: false,
      depth: 0,
    })
    expect(updated.assignedCities).toEqual([damascus.id])
  })
})

describe('media', () => {
  it('requires alt text', async () => {
    const p = await payload()
    await expect(
      p.create({ collection: 'media', data: {} as never, file: await png(), user: correspondent, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('a correspondent can upload; uploadedBy is set by the server, not the client', async () => {
    const p = await payload()
    const m = await p.create({
      collection: 'media',
      data: { alt: 'باب خشب', uploadedBy: editor.id },
      file: await png(),
      user: correspondent,
      overrideAccess: false,
      depth: 0,
    })
    expect(m.uploadedBy).toBe(correspondent.id)
    expect(m.sizes?.thumb?.filename).toMatch(/\.webp$/)
    expect(m.sizes?.thumb?.width).toBe(400)
    expect(m.sizes?.hero?.width).toBe(1600)
  })

  it('a correspondent edits only their own uploads', async () => {
    const p = await payload()
    const mine = await p.create({ collection: 'media', data: { alt: 'mine' }, file: await png(), user: correspondent, overrideAccess: false })
    const theirs = await p.create({ collection: 'media', data: { alt: 'theirs' }, file: await png(), user: otherCorrespondent, overrideAccess: false })

    const ok = await p.update({ collection: 'media', id: mine.id, data: { alt: 'edited' }, user: correspondent, overrideAccess: false })
    expect(ok.alt).toBe('edited')
    await expect(
      p.update({ collection: 'media', id: theirs.id, data: { alt: 'hijack' }, user: correspondent, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(p.delete({ collection: 'media', id: theirs.id, user: correspondent, overrideAccess: false })).rejects.toThrow()
  })

  it('an editor can edit anyone’s upload', async () => {
    const p = await payload()
    const theirs = await p.create({ collection: 'media', data: { alt: 'x' }, file: await png(), user: correspondent, overrideAccess: false })
    const ok = await p.update({ collection: 'media', id: theirs.id, data: { credit: 'مراسل دمشق' }, user: editor, overrideAccess: false })
    expect(ok.credit).toBe('مراسل دمشق')
  })
})
