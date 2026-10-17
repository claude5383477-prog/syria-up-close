import { beforeAll, describe, expect, it } from 'vitest'
import type { City, User } from '@/payload-types'
import { confirmStatusItem } from '@/endpoints/confirmStatusItem'
import { makeUser, payload, resetWithAdmin } from './helpers'

let admin: User
let editor: User
let corr: User
let damascus: City

beforeAll(async () => {
  admin = await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor')
  damascus = await p.create({ collection: 'cities', data: { slug: 'damascus', name: 'دمشق' }, user: editor, overrideAccess: false })
  corr = await makeUser('correspondent', { assignedCities: [damascus.id] })
})

const lastLog = async (collection: string) => {
  const p = await payload()
  const { docs } = await p.find({ collection: 'auditLog', where: { collection: { equals: collection } }, sort: '-id', limit: 1, depth: 0 })
  return docs[0]
}

describe('audit log', () => {
  it('records creates with who, what and when', async () => {
    const p = await payload()
    const item = await p.create({
      collection: 'statusItems',
      data: { city: damascus.id, type: 'electricity', value: 'جيدة' },
      user: corr,
      overrideAccess: false,
    })
    const log = await lastLog('statusItems')
    expect(log).toMatchObject({ operation: 'create', docId: String(item.id), user: corr.id })
    expect(log?.changedFields).toEqual(expect.arrayContaining(['value', 'city', 'type']))
    expect(log?.at).toBeTruthy()
  })

  it('records updates with only the fields that changed', async () => {
    const p = await payload()
    await p.update({ collection: 'cities', id: damascus.id, data: { tag: 'المدينة القديمة' }, user: editor, overrideAccess: false })
    const log = await lastLog('cities')
    expect(log).toMatchObject({ operation: 'update', user: editor.id })
    expect(log?.changedFields).toEqual(['tag'])
  })

  it('records "no change, verified today" as confirm', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'statusItems', limit: 1 })
    await confirmStatusItem(p, docs[0]!.id, corr)
    expect(await lastLog('statusItems')).toMatchObject({ operation: 'confirm', user: corr.id })
  })

  it('records deletes', async () => {
    const p = await payload()
    const city = await p.create({ collection: 'cities', data: { slug: 'temp', name: 'مؤقت' }, user: editor, overrideAccess: false })
    await p.delete({ collection: 'cities', id: city.id, user: editor, overrideAccess: false })
    expect(await lastLog('cities')).toMatchObject({ operation: 'delete', docId: String(city.id), user: editor.id })
  })

  it('never records password values, only that a password changed', async () => {
    const p = await payload()
    await p.update({ collection: 'users', id: corr.id, data: { password: 'a-brand-new-password' }, user: corr, overrideAccess: false })
    const log = await lastLog('users')
    expect(log?.changedFields).toContain('password')
    expect(JSON.stringify(log)).not.toContain('a-brand-new-password')
  })

  it('only admins can read it', async () => {
    const p = await payload()
    expect((await p.find({ collection: 'auditLog', user: admin, overrideAccess: false })).totalDocs).toBeGreaterThan(0)
    await expect(p.find({ collection: 'auditLog', user: editor, overrideAccess: false })).rejects.toThrow()
    await expect(p.find({ collection: 'auditLog', user: corr, overrideAccess: false })).rejects.toThrow()
  })

  it('nobody can create, edit or delete entries, not even an admin', async () => {
    const p = await payload()
    const { docs } = await p.find({ collection: 'auditLog', limit: 1, depth: 0 })
    const id = docs[0]!.id
    await expect(p.update({ collection: 'auditLog', id, data: { operation: 'delete' }, user: admin, overrideAccess: false })).rejects.toThrow()
    await expect(p.delete({ collection: 'auditLog', id, user: admin, overrideAccess: false })).rejects.toThrow()
    await expect(
      p.create({
        collection: 'auditLog',
        data: { at: new Date().toISOString(), collection: 'x', docId: '1', operation: 'create' },
        user: admin,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
