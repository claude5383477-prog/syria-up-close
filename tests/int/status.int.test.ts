import { beforeAll, describe, expect, it } from 'vitest'
import type { City, User } from '@/payload-types'
import { confirmStatusItem } from '@/endpoints/confirmStatusItem'
import { makeUser, payload, resetWithAdmin } from './helpers'

let damascus: City
let aleppo: City
let damascusCorr: User
let aleppoCorr: User
let editor: User

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  damascus = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق' } })
  aleppo = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'aleppo', name: 'حلب' } })
  damascusCorr = await makeUser('correspondent', { assignedCities: [damascus.id] })
  aleppoCorr = await makeUser('correspondent', { assignedCities: [aleppo.id] })
  editor = await makeUser('editor')
})

const as = (user: User) => ({ user, overrideAccess: false, depth: 0 }) as const

describe('statusItems', () => {
  it('a correspondent publishes for their city; name and time are stamped by the server', async () => {
    const p = await payload()
    const before = Date.now()
    const item = await p.create({
      collection: 'statusItems',
      data: { city: damascus.id, type: 'electricity', value: 'ساعتين وصل بأربع ساعات قطع', verifiedBy: editor.id, verifiedAt: '2020-01-01T00:00:00.000Z' },
      ...as(damascusCorr),
    })
    expect(item.verifiedBy).toBe(damascusCorr.id)
    expect(item.verifiedByName).toBe(damascusCorr.displayName)
    expect(new Date(item.verifiedAt!).getTime()).toBeGreaterThanOrEqual(before - 1000)
  })

  it('is public to read', async () => {
    const p = await payload()
    const res = await p.find({ collection: 'statusItems', overrideAccess: false, where: { city: { equals: damascus.id } } })
    expect(res.totalDocs).toBe(1)
    // Visitors see who verified it by name, without access to the users collection.
    expect(res.docs[0]?.verifiedByName).toBe(damascusCorr.displayName)
    await expect(p.find({ collection: 'users', overrideAccess: false })).rejects.toThrow()
  })

  it('a Damascus correspondent cannot create, edit or delete Aleppo items', async () => {
    const p = await payload()
    await expect(p.create({ collection: 'statusItems', data: { city: aleppo.id, type: 'roads', value: 'x' }, ...as(damascusCorr) })).rejects.toThrow()
    const aleppoItem = await p.create({ collection: 'statusItems', data: { city: aleppo.id, type: 'roads', value: 'سالكة' }, ...as(aleppoCorr) })
    await expect(p.update({ collection: 'statusItems', id: aleppoItem.id, data: { value: 'x' }, ...as(damascusCorr) })).rejects.toThrow()
    await expect(p.delete({ collection: 'statusItems', id: aleppoItem.id, ...as(damascusCorr) })).rejects.toThrow()
  })

  it('a correspondent cannot move an item to another city', async () => {
    const p = await payload()
    const own = await p.create({ collection: 'statusItems', data: { city: damascus.id, type: 'internet', value: 'بطيء' }, ...as(damascusCorr) })
    const moved = await p.update({ collection: 'statusItems', id: own.id, data: { city: aleppo.id, type: 'roads' }, ...as(damascusCorr) })
    expect(moved.city).toBe(damascus.id)
    expect(moved.type).toBe('internet')
  })

  it('only one item per city and type', async () => {
    const p = await payload()
    await expect(
      p.create({ collection: 'statusItems', data: { city: damascus.id, type: 'electricity', value: 'dup' }, ...as(editor) }),
    ).rejects.toThrow()
  })

  it('keeps every update as a version (history)', async () => {
    const p = await payload()
    const item = await p.create({ collection: 'statusItems', data: { city: damascus.id, type: 'weather', value: 'مشمس' }, ...as(damascusCorr) })
    await p.update({ collection: 'statusItems', id: item.id, data: { value: 'ماطر' }, ...as(damascusCorr) })
    await p.update({ collection: 'statusItems', id: item.id, data: { value: 'ثلج' }, ...as(damascusCorr) })
    const versions = await p.findVersions({ collection: 'statusItems', where: { parent: { equals: item.id } }, limit: 10 })
    expect(versions.totalDocs).toBeGreaterThanOrEqual(3)
  })

  it('rejects non-https sources and over-long values', async () => {
    const p = await payload()
    await expect(
      p.create({ collection: 'statusItems', data: { city: damascus.id, type: 'events', value: 'x', sourceUrl: 'http://example.com' }, ...as(editor) }),
    ).rejects.toThrow()
    await expect(
      p.create({ collection: 'statusItems', data: { city: aleppo.id, type: 'events', value: 'x'.repeat(281) }, ...as(editor) }),
    ).rejects.toThrow()
  })
})

describe('confirm ("no change, verified today")', () => {
  it('renews the date and signer only, leaving the value untouched', async () => {
    const p = await payload()
    const item = await p.create({ collection: 'statusItems', data: { city: aleppo.id, type: 'internet', value: 'جيد' }, ...as(editor) })
    await p.db.updateOne({ collection: 'statusItems', id: item.id, data: { verifiedAt: '2026-01-01T00:00:00.000Z' } })

    const confirmed = await confirmStatusItem(p, item.id, aleppoCorr)
    expect(confirmed.value).toBe('جيد')
    expect(confirmed.verifiedBy).toBe(aleppoCorr.id)
    expect(new Date(confirmed.verifiedAt!).getFullYear()).toBeGreaterThan(2026 - 1)
    expect(new Date(confirmed.verifiedAt!).getTime()).toBeGreaterThan(new Date('2026-01-02').getTime())
  })

  it('is refused for another city', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'statusItems', where: { city: { equals: aleppo.id } }, limit: 1 })
    await expect(confirmStatusItem(p, docs[0]!.id, damascusCorr)).rejects.toThrow()
  })
})
