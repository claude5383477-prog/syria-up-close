import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import type { City, User } from '@/payload-types'
import { makeUser, payload, resetWithAdmin } from './helpers'

// Visitors see a correspondent's public name, never their account id: correspondents in one city
// share the default display name, so the id alone would tie one person's reports, photos and
// check times together.

let editor: User
let corr: User
let damascus: City
const anon = { overrideAccess: false, depth: 0 } as const

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor')
  damascus = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق' } })
  corr = await makeUser('correspondent', { assignedCities: [damascus.id] })
})

describe('account ids are not public', () => {
  it('a published status item, report and photo do not show which account made them', async () => {
    const p = await payload()
    const as = { user: corr, overrideAccess: false, depth: 0 } as const
    const data = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#B5713A' } }).png().toBuffer()
    const photo = await p.create({ collection: 'media', data: { alt: 'صورة' }, file: { data, mimetype: 'image/png', name: 'p.png', size: data.length }, ...as })
    await p.create({ collection: 'statusItems', data: { city: damascus.id, type: 'internet', value: 'بطيء' }, ...as })
    const report = await p.create({ collection: 'seasonReports', draft: true, data: { title: 'تقرير', city: damascus.id, fieldDate: '2026-10-01T00:00:00.000Z', photos: [photo.id] }, ...as })
    await p.update({ collection: 'seasonReports', id: report.id, data: { _status: 'published' }, user: editor, overrideAccess: false })

    const status = (await p.find({ collection: 'statusItems', ...anon })).docs[0]!
    const pub = (await p.find({ collection: 'seasonReports', ...anon })).docs[0]!
    const media = (await p.find({ collection: 'media', ...anon })).docs[0]!
    expect(status.verifiedByName).toBeTruthy()
    expect(pub.authorName).toBeTruthy()
    expect(status.verifiedBy).toBeUndefined()
    expect(pub.author).toBeUndefined()
    expect(media.uploadedBy).toBeUndefined()

    // Staff still see who it was.
    const staffView = await p.findByID({ collection: 'seasonReports', id: report.id, user: editor, overrideAccess: false, depth: 0 })
    expect(staffView.author).toBe(corr.id)
  })
})
