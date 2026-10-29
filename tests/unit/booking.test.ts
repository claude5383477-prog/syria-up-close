import { describe, expect, it } from 'vitest'
import {
  CUSTOM_TRIP,
  bookingCode,
  bookingStats,
  bookingsCsv,
  cancelledMail,
  confirmedMail,
  csvCell,
  guideCopyMail,
  isTourLanguage,
  needsReminder,
  newBookingMail,
  pendingMail,
  requestIp,
  sameOrigin,
  testMail,
  validateBooking,
  type BookingRow,
} from '@/lib/booking'
import { clientKey } from '@/lib/booking-key'

const guide = { trips: ['t1', 't2'], languages: ['ar', 'en'] }
const ok = { trip: 't1', date: '2026-11-02', people: 2, language: 'en', name: 'Lina', email: 'Lina@Example.com', consent: true }

describe('booking request number', () => {
  it('reads SUC-<1000 + id>', () => {
    expect(bookingCode(49)).toBe('SUC-1049')
    expect(bookingCode(1)).toBe('SUC-1001')
  })
})

describe('validateBooking', () => {
  it('accepts a complete request and normalises it', () => {
    const r = validateBooking({ ...ok, phone: ' +963 11 222 3344 ', note: ' معنا أولاد ' }, guide, '2026-10-29')
    expect(r).toEqual({ ok: true, data: { trip: 't1', date: '2026-11-02', people: 2, language: 'en', name: 'Lina', email: 'lina@example.com', consent: true, phone: '+963 11 222 3344', note: 'معنا أولاد' } })
  })

  it('accepts a trip the visitor suggests, "on" as consent, and today', () => {
    expect(validateBooking({ ...ok, trip: CUSTOM_TRIP, consent: 'on', date: '2026-10-29' }, guide, '2026-10-29').ok).toBe(true)
    expect(validateBooking({ ...ok, consent: 'true' }, guide, '2026-10-29').ok).toBe(true)
  })

  it('names every wrong field', () => {
    const r = validateBooking({ trip: 'x', date: '2026-10-01', people: 31, language: 'fr', name: 'L', phone: 'call me', email: 'nope', note: 'x'.repeat(1001), consent: false }, guide, '2026-10-29')
    expect(r).toEqual({ ok: false, errors: ['trip', 'date', 'people', 'language', 'name', 'phone', 'email', 'note', 'consent'] })
  })

  it('refuses dates more than two years ahead, impossible dates and fractional groups', () => {
    expect(validateBooking({ ...ok, date: '2028-10-30' }, guide, '2026-10-29')).toEqual({ ok: false, errors: ['date'] })
    expect(validateBooking({ ...ok, date: '2026-13-40' }, guide, '2026-10-29')).toEqual({ ok: false, errors: ['date'] })
    expect(validateBooking({ ...ok, people: 2.5 }, guide, '2026-10-29')).toEqual({ ok: false, errors: ['people'] })
    expect(validateBooking({ ...ok, name: 7, email: null }, guide, '2026-10-29')).toEqual({ ok: false, errors: ['name', 'email'] })
  })

  it('treats a filled honeypot as spam, whatever else is there', () => {
    expect(validateBooking({ ...ok, website: 'http://spam' }, guide, '2026-10-29')).toEqual({ ok: false, errors: ['spam'] })
  })

  it('knows the tour languages', () => {
    expect(isTourLanguage('tr')).toBe(true)
    expect(isTourLanguage('xx')).toBe(false)
    expect(isTourLanguage(1)).toBe(false)
  })
})

describe('same-IP limit and origin', () => {
  it('keys a client without storing the address', () => {
    const k = clientKey('1.2.3.4', 's')
    expect(k).toHaveLength(32)
    expect(k).toBe(clientKey('1.2.3.4', 's'))
    expect(k).not.toBe(clientKey('1.2.3.5', 's'))
    expect(k).not.toContain('1.2.3.4')
  })

  it('reads the visitor address from the proxy headers', () => {
    expect(requestIp(new Headers({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }))).toBe('9.9.9.9')
    expect(requestIp(new Headers({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8')
    expect(requestIp(new Headers())).toBe('unknown')
  })

  it('accepts only our own pages', () => {
    const site = ['https://www.upclosesyria.com']
    expect(sameOrigin(new Headers({ origin: 'https://www.upclosesyria.com' }), site)).toBe(true)
    expect(sameOrigin(new Headers({ origin: 'https://evil.example' }), site)).toBe(false)
    expect(sameOrigin(new Headers({ 'sec-fetch-site': 'same-origin' }), site)).toBe(true)
    expect(sameOrigin(new Headers({ 'sec-fetch-site': 'cross-site' }), site)).toBe(false)
  })
})

const row: BookingRow = {
  code: 'SUC-1049',
  status: 'new',
  guideName: 'رامي',
  trip: 'المدينة القديمة',
  date: '2026-11-02',
  people: 1,
  language: 'en',
  name: '=HYPERLINK("x")',
  phone: null,
  email: 'a@b.co',
  note: 'معنا "أولاد"',
  createdAt: '2026-10-29T06:00:00.000Z',
}

describe('CSV export', () => {
  it('quotes cells and defuses spreadsheet formulas', () => {
    expect(csvCell('a"b')).toBe('"a""b"')
    expect(csvCell('=1+1')).toBe(`"'=1+1"`)
    expect(csvCell('@x')).toBe(`"'@x"`)
    expect(csvCell(null)).toBe('""')
    expect(csvCell(3)).toBe('"3"')
  })

  it('starts with a BOM and an Arabic header, one line per request', () => {
    const csv = bookingsCsv([row, { ...row, language: 'xx', status: 'done' }])
    expect(csv.startsWith('﻿"رقم الطلب"')).toBe(true)
    const lines = csv.trim().split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain(`"'=HYPERLINK(""x"")"`)
    expect(lines[1]).toContain('"الإنجليزية"')
    expect(lines[2]).toContain('"xx"')
    expect(lines[2]).toContain('"منجز"')
  })
})

describe('e-mails', () => {
  it('new request: details, the panel link, no price', () => {
    const m = newBookingMail({ ...row, phone: '+963 1', people: 4 }, 'https://x/admin/collections/bookings/49')
    expect(m.subject).toBe('طلب حجز جديد: SUC-1049')
    expect(m.text).toContain('4 أشخاص')
    expect(m.text).toContain('+963 1')
    expect(m.text).toContain('https://x/admin/collections/bookings/49')
    expect(m.html).toContain('dir="rtl"')
    expect(m.html).toContain('&quot;أولاد&quot;')
    expect(m.text).not.toMatch(/سعر|ليرة|\$/)
  })

  it('confirmation, cancellation, the guide copy and the test mail', () => {
    expect(confirmedMail(row).text).toContain('الكلفة يتفق عليها الدليل معك')
    expect(confirmedMail({ ...row, trip: CUSTOM_TRIP }).text).toContain('مشوار يقترحه الزائر')
    expect(cancelledMail(row).subject).toContain('SUC-1049')
    expect(guideCopyMail({ ...row, note: null }).text).toContain('لهذا الحجز فقط')
    expect(testMail().subject).toContain('تجريبي')
  })

  it('digest and reminder list the waiting requests', () => {
    expect(pendingMail('digest', [row], 'u').subject).toBe('ملخص الحجوزات: 1 بانتظار الرد')
    expect(pendingMail('reminder', [row, row], 'u').subject).toBe('تذكير: 2 طلب بلا رد من يوم')
  })
})

describe('reminders and summary numbers', () => {
  const now = new Date('2026-10-30T12:00:00.000Z')
  it('reminds once, only for a request new for a full day', () => {
    expect(needsReminder({ status: 'new', createdAt: '2026-10-29T11:00:00.000Z' }, now)).toBe(true)
    expect(needsReminder({ status: 'new', createdAt: '2026-10-29T13:00:00.000Z' }, now)).toBe(false)
    expect(needsReminder({ status: 'new', createdAt: '2026-10-28T00:00:00.000Z', remindedAt: '2026-10-29T00:00:00.000Z' }, now)).toBe(false)
    expect(needsReminder({ status: 'confirmed', createdAt: '2026-10-01T00:00:00.000Z' }, now)).toBe(false)
  })

  it('counts new, confirmed this week, and all', () => {
    expect(
      bookingStats(
        [
          { status: 'new', createdAt: '2026-10-30T00:00:00.000Z' },
          { status: 'confirmed', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-29T00:00:00.000Z' },
          { status: 'confirmed', createdAt: '2026-10-01T00:00:00.000Z' },
          { status: 'cancelled', createdAt: '2026-10-29T00:00:00.000Z' },
        ],
        now,
      ),
    ).toEqual({ new: 1, confirmedThisWeek: 1, all: 4 })
  })
})
