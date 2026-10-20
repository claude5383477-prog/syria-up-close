'use server'

import config from '@payload-config'
import { logout } from '@payloadcms/next/auth'
import { redirect } from 'next/navigation'
import { payloadClient } from '@/data/queries'
import { confirmStatusItem } from '@/endpoints/confirmStatusItem'
import { STATUS_TYPES } from '@/collections/StatusItems'
import { MAX_PHOTO_BYTES, errorCode, field, storedPhotoName, textToLexical, type ErrorCode } from './logic'
import { requireCity } from './session'
import { publicName } from '@/lib/public-name'

// Every write runs through the Payload Local API as the signed-in correspondent with
// overrideAccess: false, so the collection rules, hooks and audit log apply exactly as in the admin.
// redirect() throws, so it is always called outside try/catch.

/** Maps an error to a code for the UI and logs the original on the server (the UI only sees the code). */
async function fail(err: unknown, action: string): Promise<ErrorCode> {
  const code = errorCode(err)
  if (code === 'unknown' || code === 'file') (await payloadClient()).logger.error({ err, action }, 'correspondent action failed')
  return code
}

const back = (slug: string, params: Record<string, string>, hash = '') =>
  `/correspondent/${slug}?${new URLSearchParams(params).toString()}${hash ? `#${hash}` : ''}`

export async function logoutAction() {
  await logout({ config })
  redirect('/correspondent/login')
}

export async function saveStatus(form: FormData) {
  const slug = field(form, 'city')
  const type = field(form, 'type') as (typeof STATUS_TYPES)[number]
  const { user, city } = await requireCity(slug)
  if (!STATUS_TYPES.includes(type)) redirect(back(slug, { error: 'invalid' }))

  const p = await payloadClient()
  const data = { value: field(form, 'value'), sourceUrl: field(form, 'sourceUrl') || null }
  let code: ErrorCode | null = null
  try {
    const existing = await p.find({
      collection: 'statusItems',
      where: { and: [{ city: { equals: city.id } }, { type: { equals: type } }] },
      limit: 1,
      depth: 0,
      user,
      overrideAccess: false,
    })
    if (existing.docs[0]) {
      await p.update({ collection: 'statusItems', id: existing.docs[0].id, data, locale: 'ar', user, overrideAccess: false })
    } else {
      await p.create({ collection: 'statusItems', data: { ...data, city: city.id, type }, locale: 'ar', user, overrideAccess: false })
    }
  } catch (err) {
    code = await fail(err, 'saveStatus')
  }
  redirect(back(slug, code ? { error: code, at: type } : { saved: type }, type))
}

export async function confirmStatus(form: FormData) {
  const slug = field(form, 'city')
  const type = field(form, 'type')
  const { user } = await requireCity(slug)
  let code: ErrorCode | null = null
  try {
    await confirmStatusItem(await payloadClient(), field(form, 'id'), user)
  } catch (err) {
    code = await fail(err, 'confirmStatus')
  }
  redirect(back(slug, code ? { error: code, at: type } : { confirmed: type }, type))
}

/** Uploads one photo (already compressed in the browser when JS is available). Returns the media id. */
async function uploadPhoto(form: FormData, user: Awaited<ReturnType<typeof requireCity>>['user']): Promise<number | ErrorCode | null> {
  const file = form.get('photo')
  if (!(file instanceof File) || file.size === 0) return null
  if (file.size > MAX_PHOTO_BYTES) return 'too_large'
  const alt = field(form, 'alt')
  if (!alt) return 'alt'
  const p = await payloadClient()
  try {
    const media = await p.create({
      collection: 'media',
      data: { alt, credit: publicName(user), shotDate: field(form, 'shotDate') || null },
      file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: storedPhotoName(file.name), size: file.size },
      locale: 'ar',
      user,
      overrideAccess: false,
    })
    return media.id
  } catch (err) {
    return fail(err, 'uploadPhoto')
  }
}

export async function addPhoto(form: FormData) {
  const slug = field(form, 'city')
  const { user } = await requireCity(slug)
  const result = await uploadPhoto(form, user)
  const code = typeof result === 'string' ? result : result === null ? 'file' : null
  redirect(back(slug, code ? { error: code, at: 'photo' } : { saved: 'photo' }, 'photo'))
}

export async function submitReport(form: FormData) {
  const slug = field(form, 'city')
  const { user, city } = await requireCity(slug)
  const title = field(form, 'title')
  const fieldDate = field(form, 'fieldDate')
  if (!title || !fieldDate) redirect(`/correspondent/${slug}/report?error=invalid`)

  const photo = await uploadPhoto(form, user)
  let code: ErrorCode | null = typeof photo === 'string' ? photo : null
  if (!code) {
    try {
      await (await payloadClient()).create({
        collection: 'seasonReports',
        draft: true,
        data: {
          title,
          city: city.id,
          fieldDate,
          body: textToLexical(field(form, 'body')),
          photos: typeof photo === 'number' ? [photo] : [],
          _status: 'draft',
        },
        user,
        overrideAccess: false,
      })
    } catch (err) {
      code = await fail(err, 'submitReport')
    }
  }
  redirect(code ? `/correspondent/${slug}/report?error=${code}` : back(slug, { saved: 'report' }, 'report'))
}
