// Guide booking requests (batch 4, 2026-10-29): the request number, input checks, the same-IP limit,
// the CSV export and the Arabic e-mails. No payment and no price anywhere: the guide agrees the cost
// with the visitor and it reaches them with the confirmation (ق4).

export const BOOKING_STATUSES = ['new', 'confirmed', 'cancelled', 'done'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const STATUS_LABELS: Record<BookingStatus, { ar: string; en: string }> = {
  new: { ar: 'جديد', en: 'New' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  cancelled: { ar: 'ملغى', en: 'Cancelled' },
  done: { ar: 'منجز', en: 'Done' },
}

/** Languages a guide can lead a tour in (the guide's profile and the booking form), named in the page language. */
export const TOUR_LANGUAGES = {
  ar: { ar: 'العربية', en: 'Arabic' },
  en: { ar: 'الإنجليزية', en: 'English' },
  fr: { ar: 'الفرنسية', en: 'French' },
  de: { ar: 'الألمانية', en: 'German' },
  tr: { ar: 'التركية', en: 'Turkish' },
  ru: { ar: 'الروسية', en: 'Russian' },
  es: { ar: 'الإسبانية', en: 'Spanish' },
  it: { ar: 'الإيطالية', en: 'Italian' },
  fa: { ar: 'الفارسية', en: 'Persian' },
  ku: { ar: 'الكردية', en: 'Kurdish' },
} as const
export type TourLanguage = keyof typeof TOUR_LANGUAGES
export const isTourLanguage = (v: unknown): v is TourLanguage => typeof v === 'string' && Object.hasOwn(TOUR_LANGUAGES, v)

/** The trip value for "a trip you suggest" (not one of the guide's listed trips). */
export const CUSTOM_TRIP = '__custom'

/** "SUC-1049": readable, sequential, never reused (from the row id). */
export const bookingCode = (id: number): string => `SUC-${1000 + id}`

export const MAX_PEOPLE = 30
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[\d\s()-]{6,24}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

export type BookingInput = {
  trip: string
  date: string
  people: number
  language: TourLanguage
  name: string
  phone?: string
  email: string
  note?: string
  consent: true
}

export type BookingError = 'trip' | 'date' | 'people' | 'language' | 'name' | 'phone' | 'email' | 'note' | 'consent' | 'spam'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max + 1) : '')

/**
 * Checks a request against the guide it is for. `today` is the visitor-facing date (YYYY-MM-DD,
 * Damascus); a booking is for today up to two years ahead. `website` is the honeypot: people never see
 * it, bots fill it.
 */
export function validateBooking(
  raw: Record<string, unknown>,
  guide: { trips: string[]; languages: readonly string[] },
  today: string,
): { ok: true; data: BookingInput } | { ok: false; errors: BookingError[] } {
  if (str(raw.website, 200)) return { ok: false, errors: ['spam'] }
  const errors: BookingError[] = []
  const trip = str(raw.trip, 200)
  const date = str(raw.date, 10)
  const people = Number(raw.people)
  const language = str(raw.language, 5)
  const name = str(raw.name, 80)
  const phone = str(raw.phone, 24)
  const email = str(raw.email, 200).toLowerCase()
  const note = str(raw.note, 1000)

  if (!trip || (trip !== CUSTOM_TRIP && !guide.trips.includes(trip))) errors.push('trip')
  const limit = `${Number(today.slice(0, 4)) + 2}${today.slice(4)}`
  if (!DAY.test(date) || Number.isNaN(Date.parse(date)) || date < today || date > limit) errors.push('date')
  if (!Number.isInteger(people) || people < 1 || people > MAX_PEOPLE) errors.push('people')
  if (!isTourLanguage(language) || !guide.languages.includes(language)) errors.push('language')
  if (name.length < 2 || name.length > 80) errors.push('name')
  if (phone && !PHONE.test(phone)) errors.push('phone')
  if (!EMAIL.test(email) || email.length > 200) errors.push('email')
  if (note.length > 1000) errors.push('note')
  if (raw.consent !== true && raw.consent !== 'on' && raw.consent !== 'true') errors.push('consent')
  if (errors.length) return { ok: false, errors }
  return {
    ok: true,
    data: { trip, date, people, language: language as TourLanguage, name, email, consent: true, ...(phone ? { phone } : {}), ...(note ? { note } : {}) },
  }
}

/** Same-IP limit: this many requests per window, then "try later". */
export const RATE = { max: 3, windowMinutes: 15 } as const

/** The first address in x-forwarded-for (Vercel puts the visitor first), else x-real-ip. */
export function requestIp(headers: Headers): string {
  return (headers.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * A browser form POST from our own pages: Origin matches, or (no Origin) the browser says same-origin.
 * Another site cannot make a visitor's browser file requests in their name.
 */
export function sameOrigin(headers: Headers, siteOrigins: readonly string[]): boolean {
  const origin = headers.get('origin')
  if (origin) return siteOrigins.includes(origin)
  return headers.get('sec-fetch-site') === 'same-origin'
}

export type BookingRow = {
  code?: string | null
  status: BookingStatus
  guideName: string
  trip: string
  date: string
  people: number
  language: string
  name: string
  phone?: string | null
  email: string
  note?: string | null
  createdAt: string
}

/** One CSV cell: quoted, and a leading = + - @ is defused so a spreadsheet never runs it as a formula. */
export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export function bookingsCsv(rows: BookingRow[]): string {
  const head = ['رقم الطلب', 'الحالة', 'الدليل', 'المشوار', 'التاريخ', 'الأشخاص', 'اللغة', 'الاسم', 'الهاتف', 'الإيميل', 'ملاحظة', 'وصل']
  const lines = rows.map((r) =>
    [r.code, STATUS_LABELS[r.status].ar, r.guideName, r.trip, r.date, r.people, TOUR_LANGUAGES[r.language as TourLanguage]?.ar ?? r.language, r.name, r.phone, r.email, r.note, r.createdAt]
      .map(csvCell)
      .join(','),
  )
  // BOM so Excel opens the Arabic as UTF-8 (built from its code so the source stays plain text).
  const BOM = String.fromCharCode(0xfeff)
  return `${BOM}${[head.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`
}

const tripText = (trip: string) => (trip === CUSTOM_TRIP ? 'مشوار يقترحه الزائر' : trip)
const langText = (l: string) => TOUR_LANGUAGES[l as TourLanguage]?.ar ?? l
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export type Mail = { subject: string; text: string; html: string }

function mail(subject: string, lines: string[]): Mail {
  return {
    subject,
    text: lines.join('\n'),
    html: `<div dir="rtl" lang="ar" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#1C1915">${lines.map((l) => `<p style="margin:0 0 8px">${esc(l)}</p>`).join('')}</div>`,
  }
}

const details = (b: BookingRow) => [
  `${b.guideName} · ${tripText(b.trip)} · ${b.date} · ${b.people} ${b.people === 1 ? 'شخص' : 'أشخاص'} · ${langText(b.language)}`,
  `الزائر: ${b.name} · هاتف: ${b.phone || '—'} · إيميل: ${b.email}`,
  ...(b.note ? [`ملاحظة: ${b.note}`] : []),
]

/** To the team, for every new request (notificationSettings.onNew). */
export const newBookingMail = (b: BookingRow, adminUrl: string): Mail =>
  mail(`طلب حجز جديد: ${b.code}`, [...details(b), `افتح الطلب في اللوحة: ${adminUrl}`])

/** To the visitor, when the team confirms. */
export const confirmedMail = (b: BookingRow): Mail =>
  mail(`تأكد طلبك ${b.code} · سوريا عن قرب`, [
    `مرحبا ${b.name}،`,
    `تأكد مشوارك "${tripText(b.trip)}" يوم ${b.date} مع ${b.guideName}. الدليل رح يتواصل معك قبل بيوم.`,
    'الكلفة يتفق عليها الدليل معك مباشرة. ما في دفع عن طريق موقعنا.',
    `سوريا عن قرب · رقم الطلب ${b.code}`,
  ])

/** To the visitor, when the team cancels. */
export const cancelledMail = (b: BookingRow): Mail =>
  mail(`طلبك ${b.code} · سوريا عن قرب`, [
    `مرحبا ${b.name}،`,
    `للأسف ما قدرنا نأكد مشوار "${tripText(b.trip)}" يوم ${b.date}. إذا بتحب نقترح عليك يوم تاني أو دليل تاني، رد على هالإيميل.`,
    `سوريا عن قرب · رقم الطلب ${b.code}`,
  ])

/** To the guide, after confirmation only (notificationSettings.copyToGuide). */
export const guideCopyMail = (b: BookingRow): Mail =>
  mail(`حجز مؤكد ${b.code} · سوريا عن قرب`, [...details(b), 'الزائر وافق على مشاركة اسمه ورقمه معك لهذا الحجز فقط.'])

/** The 9 a.m. digest, and the 24-hour reminder: requests still waiting for an answer. */
export const pendingMail = (kind: 'digest' | 'reminder', rows: BookingRow[], adminUrl: string): Mail =>
  mail(kind === 'digest' ? `ملخص الحجوزات: ${rows.length} بانتظار الرد` : `تذكير: ${rows.length} طلب بلا رد من يوم`, [
    ...rows.map((b) => `${b.code} · ${b.guideName} · ${tripText(b.trip)} · ${b.date}`),
    `افتح الحجوزات: ${adminUrl}`,
  ])

export const testMail = (): Mail => mail('إيميل تجريبي · سوريا عن قرب', ['هذا إيميل تجريبي من لوحة التحكم: إعدادات إشعارات الحجوزات تعمل.'])

/** Requests that have waited a full day without an answer and were not reminded about yet. */
export function needsReminder(b: { status: BookingStatus; createdAt: string; remindedAt?: string | null }, now: Date): boolean {
  return b.status === 'new' && !b.remindedAt && now.getTime() - Date.parse(b.createdAt) >= 24 * 3600_000
}

/** The summary numbers on the bookings screen. */
export function bookingStats(rows: { status: BookingStatus; createdAt: string; updatedAt?: string }[], now: Date) {
  const week = now.getTime() - 7 * 24 * 3600_000
  return {
    new: rows.filter((r) => r.status === 'new').length,
    confirmedThisWeek: rows.filter((r) => r.status === 'confirmed' && Date.parse(r.updatedAt ?? r.createdAt) >= week).length,
    all: rows.length,
  }
}
