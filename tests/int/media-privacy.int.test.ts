import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import type { City, Media, User } from '@/payload-types'
import { makeUser, payload, resetWithAdmin } from './helpers'

// Photos are private until published (security audit M2): a correspondent's upload is visible only
// to them and to staff until an editor publishes something that uses it. Staff uploads are public.

let editor: User
let corr: User
let otherCorr: User
let damascus: City

const as = (user: User) => ({ user, overrideAccess: false, depth: 0 }) as const
const anon = { overrideAccess: false, depth: 0 } as const

async function upload(user: User, alt: string): Promise<Media> {
  const p = await payload()
  const data = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#B5713A' } }).png().toBuffer()
  return p.create({ collection: 'media', data: { alt }, file: { data, mimetype: 'image/png', name: `${alt}.png`, size: data.length }, ...as(user) })
}

const visible = async (id: number, opts: object) =>
  (await (await payload()).find({ collection: 'media', where: { id: { equals: id } }, ...opts })).totalDocs === 1

beforeAll(async () => {
  await resetWithAdmin()
  const p = await payload()
  editor = await makeUser('editor')
  damascus = await p.create({ collection: 'cities', overrideAccess: true, data: { slug: 'damascus', name: 'دمشق' } })
  corr = await makeUser('correspondent', { assignedCities: [damascus.id] })
  otherCorr = await makeUser('correspondent', { assignedCities: [damascus.id] })
})

describe('media privacy', () => {
  it("a correspondent's upload is private: only they and staff can see it", async () => {
    const photo = await upload(corr, 'باب في القيمرية')
    expect(await visible(photo.id, anon)).toBe(false)
    expect(await visible(photo.id, as(otherCorr))).toBe(false)
    expect(await visible(photo.id, as(corr))).toBe(true)
    expect(await visible(photo.id, as(editor))).toBe(true)
  })

  it('a staff upload is public at once', async () => {
    const photo = await upload(editor, 'غلاف دمشق')
    expect(await visible(photo.id, anon)).toBe(true)
  })

  it("publishing a season report makes its photos public, and the public page gets them", async () => {
    const p = await payload()
    const photo = await upload(corr, 'قطاف الزيتون')
    const report = await p.create({
      collection: 'seasonReports',
      draft: true,
      data: { title: 'قطاف', city: damascus.id, fieldDate: '2026-10-05T00:00:00.000Z', photos: [photo.id] },
      ...as(corr),
    })
    expect(await visible(photo.id, anon)).toBe(false)

    await p.update({ collection: 'seasonReports', id: report.id, data: { _status: 'published' }, ...as(editor) })
    expect(await visible(photo.id, anon)).toBe(true)
    const pub = await p.findByID({ collection: 'seasonReports', id: report.id, overrideAccess: false, depth: 1 })
    expect((pub.photos?.[0] as Media | undefined)?.id).toBe(photo.id)
  })

  it("a draft that uses a photo does not publish it", async () => {
    const p = await payload()
    const photo = await upload(corr, 'مسودة فقط')
    await p.create({ collection: 'stories', draft: true, data: { title: 'قصة', slug: 'story-draft', photos: [photo.id] }, ...as(editor) })
    expect(await visible(photo.id, anon)).toBe(false)
  })

  it('an editor using a correspondent photo on a place (no drafts) makes it public', async () => {
    const p = await payload()
    const photo = await upload(corr, 'سوق الحميدية')
    await p.create({ collection: 'places', data: { city: damascus.id, title: 'سوق الحميدية', image: photo.id }, ...as(editor) })
    expect(await visible(photo.id, anon)).toBe(true)
  })

  it('a correspondent cannot approve their own photo', async () => {
    const p = await payload()
    const photo = await upload(corr, 'محاولة')
    await p.update({ collection: 'media', id: photo.id, data: { approved: true } as never, ...as(corr) }).catch(() => undefined)
    expect(await visible(photo.id, anon)).toBe(false)
  })

  describe('once approved, only editors may change a photo', () => {
    const png = async (color: string) => {
      const data = await sharp({ create: { width: 32, height: 32, channels: 3, background: color } }).png().toBuffer()
      return { data, mimetype: 'image/png', name: 'replacement.png', size: data.length }
    }
    const approvedPhoto = async () => {
      const p = await payload()
      const photo = await upload(corr, `للنشر ${Math.random()}`)
      await p.create({ collection: 'places', data: { city: damascus.id, title: `مكان ${photo.id}`, image: photo.id }, ...as(editor) })
      expect(await visible(photo.id, anon)).toBe(true)
      return photo
    }

    it('the correspondent can no longer edit, replace or delete it', async () => {
      const p = await payload()
      const photo = await approvedPhoto()
      await expect(p.update({ collection: 'media', id: photo.id, data: { alt: 'نص بديل' }, ...as(corr) })).rejects.toThrow()
      await expect(p.update({ collection: 'media', id: photo.id, data: {}, file: await png('#ff0000'), ...as(corr) })).rejects.toThrow()
      await expect(p.delete({ collection: 'media', id: photo.id, ...as(corr) })).rejects.toThrow()
      const after = await p.findByID({ collection: 'media', id: photo.id, overrideAccess: true, depth: 0 })
      expect(after.alt).toBe(photo.alt)
      expect(after.filename).toBe(photo.filename)
    })

    it('an editor still can', async () => {
      const p = await payload()
      const photo = await approvedPhoto()
      const edited = await p.update({ collection: 'media', id: photo.id, data: { alt: 'وصف المحرر' }, ...as(editor) })
      expect(edited.alt).toBe('وصف المحرر')
      await p.delete({ collection: 'media', id: photo.id, ...as(editor) })
    })

    it('before approval the correspondent still manages their own photo', async () => {
      const p = await payload()
      const photo = await upload(corr, 'قبل الاعتماد')
      const edited = await p.update({ collection: 'media', id: photo.id, data: { alt: 'تصحيح الوصف' }, ...as(corr) })
      expect(edited.alt).toBe('تصحيح الوصف')
      await p.delete({ collection: 'media', id: photo.id, ...as(corr) })
    })
  })

  describe('a correspondent can attach only their own or approved photos (G1)', () => {
    const draft = async (photos: number[]) =>
      (await payload()).create({
        collection: 'seasonReports',
        draft: true,
        data: { title: `مسودة ${Math.random()}`, city: damascus.id, fieldDate: '2026-10-06T00:00:00.000Z', photos },
        ...as(corr),
      })

    it("another correspondent's unapproved photo is refused", async () => {
      const theirs = await upload(otherCorr, 'صورة زميل')
      await expect(draft([theirs.id])).rejects.toThrow()
      expect(await visible(theirs.id, anon)).toBe(false)
    })

    it('their own photo and an approved photo are accepted', async () => {
      const mine = await upload(corr, 'صورتي للتقرير')
      const approved = await upload(editor, 'صورة معتمدة')
      const report = await draft([mine.id, approved.id])
      expect(report.photos).toEqual([mine.id, approved.id])
    })

    it('photos and document links inside the report text are refused (only the photos field, under the rule above)', async () => {
      const p = await payload()
      const theirs = await upload(otherCorr, 'صورة زميل في النص')
      const body = (node: Record<string, unknown>) => ({
        root: { type: 'root', direction: null, format: '', indent: 0, version: 1, children: [{ format: '', version: 3, fields: null, ...node }] },
      })
      const report = (b: unknown) =>
        p.create({
          collection: 'seasonReports',
          draft: true,
          data: { title: `نص ${Math.random()}`, city: damascus.id, fieldDate: '2026-10-08T00:00:00.000Z', body: b as never },
          ...as(corr),
        })
      await expect(report(body({ type: 'upload', relationTo: 'media', value: theirs.id }))).rejects.toThrow()
      await expect(report(body({ type: 'relationship', relationTo: 'media', value: theirs.id }))).rejects.toThrow()
      const words = (t: string) => [{ type: 'text', text: t, format: 0, mode: 'normal', style: '', detail: 0, version: 1 }]
      const link = (fields: Record<string, unknown>) =>
        body({ type: 'paragraph', direction: null, indent: 0, textFormat: 0, children: [{ type: 'link', direction: null, format: '', indent: 0, version: 3, fields, children: words('رابط') }] })
      // An internal link to a document, and any node outside plain text (drafts skip validation).
      await expect(report(link({ linkType: 'internal', doc: { relationTo: 'media', value: theirs.id } }))).rejects.toThrow()
      await expect(report(body({ type: 'block', fields: { blockType: 'x', photo: theirs.id } }))).rejects.toThrow()
      const text = body({ type: 'paragraph', direction: null, indent: 0, textFormat: 0, children: words('نص فقط') })
      expect((await report(text)).body).toBeTruthy()
      expect((await report(link({ linkType: 'custom', url: 'https://example.org/', newTab: false }))).body).toBeTruthy()
    })

    it('a photo an editor added stays, and the correspondent can still save their draft', async () => {
      const p = await payload()
      const mine = await upload(corr, 'صورتي في المسودة')
      const report = await draft([mine.id])
      const theirs = await upload(otherCorr, 'أضافها المحرر')
      await p.update({ collection: 'seasonReports', id: report.id, draft: true, data: { photos: [mine.id, theirs.id] }, ...as(editor) })
      const saved = await p.update({ collection: 'seasonReports', id: report.id, draft: true, data: { title: 'عنوان مصحح' }, ...as(corr) })
      expect(saved.title).toBe('عنوان مصحح')
      expect(saved.photos).toEqual([mine.id, theirs.id])
      const another = await upload(otherCorr, 'صورة زميل أخرى')
      await expect(
        p.update({ collection: 'seasonReports', id: report.id, draft: true, data: { photos: [mine.id, theirs.id, another.id] }, ...as(corr) }),
      ).rejects.toThrow()
    })

    it('duplicating a draft does not carry over a colleague’s photo an editor added', async () => {
      const p = await payload()
      const mine = await upload(corr, 'صورتي للنسخ')
      const report = await draft([mine.id])
      const theirs = await upload(otherCorr, 'صورة زميل للنسخ')
      await p.update({ collection: 'seasonReports', id: report.id, draft: true, data: { photos: [mine.id, theirs.id] }, ...as(editor) })
      await expect(p.duplicate({ collection: 'seasonReports', id: report.id, draft: true, ...as(corr) })).rejects.toMatchObject({ status: 403 })
      // A draft with only their own photo duplicates fine: the refusal is the photo rule, nothing else.
      const ownOnly = await draft([mine.id])
      const copy = await p.duplicate({ collection: 'seasonReports', id: ownOnly.id, draft: true, ...as(corr) })
      expect(copy.photos).toEqual([mine.id])
    })

    it('staff may attach any photo', async () => {
      const p = await payload()
      const theirs = await upload(otherCorr, 'صورة للمحرر')
      const report = await p.create({
        collection: 'seasonReports',
        draft: true,
        data: { title: 'تقرير المحرر', city: damascus.id, fieldDate: '2026-10-07T00:00:00.000Z', photos: [theirs.id] },
        ...as(editor),
      })
      expect(report.photos).toEqual([theirs.id])
    })
  })
})
