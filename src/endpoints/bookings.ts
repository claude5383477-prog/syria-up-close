import type { Endpoint, Payload, PayloadRequest } from 'payload'
import {
  RATE,
  bookingsCsv,
  cancelledMail,
  confirmedMail,
  guideCopyMail,
  newBookingMail,
  pendingMail,
  requestIp,
  sameOrigin,
  testMail,
  validateBooking,
  needsReminder,
  type BookingRow,
  type BookingStatus,
  type Mail,
} from '@/lib/booking'
import { clientKey } from '@/lib/booking-key'
import { damascusDate } from '@/lib/docs'
import { emailChoice } from '@/lib/email'
import { secretMatches } from '@/lib/secret'
import { siteOrigins, siteUrl } from '@/lib/site-url'
import type { Booking, Guide, NotificationSetting } from '@/payload-types'

const isStaff = (req: PayloadRequest) => {
  const role = (req.user as { role?: string } | null)?.role
  return role === 'admin' || role === 'editor'
}
const json = (body: unknown, status = 200) => Response.json(body, { status })

const pick = (v: unknown): string => (v && typeof v === 'object' && ('ar' in v || 'en' in v) ? String((v as { ar?: string; en?: string }).ar ?? (v as { en?: string }).en ?? '') : String(v ?? ''))

export function toRow(b: Booking): BookingRow {
  const g = b.guide && typeof b.guide === 'object' ? (b.guide as Guide) : null
  return {
    code: b.code,
    status: b.status as BookingStatus,
    guideName: g ? pick(g.name) : String(b.guide),
    trip: b.trip,
    date: b.date,
    people: b.people,
    language: b.language,
    name: b.name,
    phone: b.phone,
    email: b.email,
    note: b.note,
    createdAt: b.createdAt,
  }
}

const adminLink = (id?: number) => `${siteUrl()}/admin/collections/bookings${id ? `/${id}` : ''}`

/** Sends one e-mail; a failure is logged and never fails the booking (mail may be unconfigured). */
export async function sendSafely(payload: Payload, to: string | string[], m: Mail): Promise<boolean> {
  const list = (Array.isArray(to) ? to : [to]).filter(Boolean)
  if (!list.length) return false
  // No adapter: Payload only logs the mail, so it was not sent (the booking is still saved).
  if (emailChoice().kind === 'none') {
    payload.logger.warn({ subject: m.subject }, 'e-mail not configured (RESEND_API_KEY or SMTP_HOST): booking e-mail not sent')
    return false
  }
  try {
    await payload.sendEmail({ to: list, subject: m.subject, text: m.text, html: m.html })
    return true
  } catch (err) {
    payload.logger.warn({ err, subject: m.subject }, 'booking e-mail not sent')
    return false
  }
}

async function settings(payload: Payload): Promise<NotificationSetting> {
  return payload.findGlobal({ slug: 'notificationSettings', overrideAccess: true, depth: 0 })
}
const recipients = (s: NotificationSetting) => (s.emails ?? []).map((e) => e.email).filter(Boolean)

const tripTitle = (guide: Guide, id: string) => {
  const t = guide.trips?.find((x) => x.id === id)
  return t ? (t.duration ? `${t.title} (${t.duration})` : t.title) : 'مشوار يقترحه الزائر'
}

/** POST /api/bookings/request: the public booking form. */
const request: Endpoint = {
  path: '/request',
  method: 'post',
  handler: async (req) => {
    if (!sameOrigin(req.headers, siteOrigins())) return json({ error: 'forbidden' }, 403)
    let body: Record<string, unknown>
    try {
      body = (await req.json?.()) as Record<string, unknown>
    } catch {
      return json({ error: 'bad-request' }, 400)
    }
    if (!body || typeof body !== 'object') return json({ error: 'bad-request' }, 400)
    const { payload } = req
    // As an anonymous visitor: a draft or unpublished guide cannot be booked.
    const guide = await payload
      .findByID({ collection: 'guides', id: Number(body.guide), overrideAccess: false, depth: 0, locale: 'ar' })
      .catch(() => null)
    if (!guide) return json({ error: 'guide' }, 404)
    // The form sends the trip's row id (the same in both languages); the request stores its Arabic title.
    const trips = (guide.trips ?? []).flatMap((t) => (t.id ? [t.id] : []))
    const checked = validateBooking(body, { trips, languages: guide.languages ?? [] }, damascusDate())
    // The honeypot gets a plain "received" so a bot learns nothing; nothing is stored.
    if (!checked.ok && checked.errors.includes('spam')) return json({ code: null })
    if (!checked.ok) return json({ error: 'invalid', fields: checked.errors }, 422)

    const key = clientKey(requestIp(req.headers), process.env.PAYLOAD_SECRET ?? 'dev')
    const since = new Date(Date.now() - RATE.windowMinutes * 60_000).toISOString()
    const recent = await payload.count({ collection: 'bookings', overrideAccess: true, where: { and: [{ clientKey: { equals: key } }, { createdAt: { greater_than: since } }] } })
    if (recent.totalDocs >= RATE.max) return json({ error: 'rate' }, 429)

    const doc = (await payload.create({
      collection: 'bookings',
      overrideAccess: true,
      depth: 0,
      data: { ...checked.data, trip: tripTitle(guide, checked.data.trip), guide: guide.id, status: 'new', clientKey: key },
    })) as Booking
    const s = await settings(payload)
    if (s.onNew !== false) await sendSafely(payload, recipients(s), newBookingMail(toRow({ ...doc, guide }), adminLink(doc.id)))
    if (!recipients(s).length) payload.logger.warn({ code: doc.code }, 'booking saved; no notification e-mails configured')
    return json({ code: doc.code }, 201)
  },
}

/** POST /api/bookings/:id/status {status, internalNote?}: confirm, cancel or mark done (staff). */
const status: Endpoint = {
  path: '/:id/status',
  method: 'post',
  handler: async (req) => {
    if (!isStaff(req)) return json({ error: 'forbidden' }, 403)
    const body = ((await req.json?.().catch(() => null)) ?? {}) as { status?: string; internalNote?: string }
    if (!['confirmed', 'cancelled', 'done', 'new'].includes(String(body.status))) return json({ error: 'status' }, 422)
    const { payload } = req
    const id = Number(req.routeParams?.id)
    const doc = (await payload.update({
      collection: 'bookings',
      id,
      req,
      overrideAccess: false,
      depth: 1,
      data: { status: body.status as BookingStatus, ...(typeof body.internalNote === 'string' ? { internalNote: body.internalNote.slice(0, 2000) } : {}) },
    })) as Booking
    const row = toRow(doc)
    let mailed = false
    if (body.status === 'confirmed') {
      mailed = await sendSafely(payload, doc.email, confirmedMail(row))
      const s = await settings(payload)
      const guide = await payload.findByID({ collection: 'guides', id: (doc.guide as Guide).id ?? Number(doc.guide), overrideAccess: true, depth: 0 }).catch(() => null)
      if (s.copyToGuide !== false && guide?.contactEmail) await sendSafely(payload, guide.contactEmail, guideCopyMail(row))
    }
    if (body.status === 'cancelled') mailed = await sendSafely(payload, doc.email, cancelledMail(row))
    return json({ status: doc.status, mailed })
  },
}

/** GET /api/bookings/export: every request as CSV (staff). */
const exportCsv: Endpoint = {
  path: '/export',
  method: 'get',
  handler: async (req) => {
    if (!isStaff(req)) return json({ error: 'forbidden' }, 403)
    const { docs } = await req.payload.find({ collection: 'bookings', req, overrideAccess: false, depth: 1, limit: 5000, sort: '-createdAt' })
    return new Response(bookingsCsv((docs as Booking[]).map(toRow)), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="bookings-${damascusDate()}.csv"`, 'Cache-Control': 'no-store' },
    })
  },
}

/**
 * GET /api/bookings/cron?kind=digest|reminder: Vercel Cron (vercel.json), authorised by CRON_SECRET
 * (Vercel sends it as a bearer token). The digest lists every request still "new"; the reminder those
 * a full day old, once each.
 */
const cron: Endpoint = {
  path: '/cron',
  method: 'get',
  handler: async (req) => {
    const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null
    if (!secretMatches(auth, process.env.CRON_SECRET)) return json({ error: 'unauthorized' }, 401)
    const kind = new URL(req.url ?? 'http://x').searchParams.get('kind')
    if (kind !== 'digest' && kind !== 'reminder') return json({ error: 'kind' }, 422)
    const { payload } = req
    const s = await settings(payload)
    if ((kind === 'digest' && !s.dailyDigest) || (kind === 'reminder' && s.reminder24h === false)) return json({ sent: 0, off: true })
    const { docs } = await payload.find({ collection: 'bookings', overrideAccess: true, depth: 1, limit: 500, where: { status: { equals: 'new' } }, sort: 'createdAt' })
    const now = new Date()
    const due = (docs as Booking[]).filter((b) => kind === 'digest' || needsReminder({ status: b.status as BookingStatus, createdAt: b.createdAt, remindedAt: b.remindedAt }, now))
    if (!due.length) return json({ sent: 0 })
    const ok = await sendSafely(payload, recipients(s), pendingMail(kind, due.map(toRow), adminLink()))
    if (ok && kind === 'reminder')
      for (const b of due) await payload.update({ collection: 'bookings', id: b.id, overrideAccess: true, depth: 0, data: { remindedAt: now.toISOString() } })
    return json({ sent: ok ? due.length : 0 })
  },
}

export const bookingEndpoints: Endpoint[] = [request, status, exportCsv, cron]

/** POST /api/globals/notificationSettings/test: a test e-mail to every address on the list (staff). */
export const testMailEndpoint: Endpoint = {
  path: '/test',
  method: 'post',
  handler: async (req) => {
    if (!isStaff(req)) return json({ error: 'forbidden' }, 403)
    const to = recipients(await settings(req.payload))
    if (!to.length) return json({ sent: 0, error: 'no-emails' }, 422)
    const ok = await sendSafely(req.payload, to, testMail())
    return json({ sent: ok ? to.length : 0 }, ok ? 200 : 502)
  },
}
