'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BOOKING_STATUSES, STATUS_LABELS, TOUR_LANGUAGES, confirmedMail, type BookingRow, type BookingStatus, type TourLanguage } from '@/lib/booking'

export type BoardRow = BookingRow & { id: number; internalNote: string; updatedAt: string }

const TONE: Record<BookingStatus, string> = { new: 'new', confirmed: 'ok', cancelled: 'no', done: 'done' }
const when = (iso: string) => new Intl.DateTimeFormat('ar-SY', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Damascus' }).format(new Date(iso))

export function BookingsBoard({ rows, stats }: { rows: BoardRow[]; stats: { new: number; confirmedThisWeek: number; all: number; guides: number } }) {
  const router = useRouter()
  const [filter, setFilter] = useState<BookingStatus | ''>('')
  const [openId, setOpenId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const open = rows.find((r) => r.id === openId) ?? null
  const shown = rows.filter((r) => !filter || r.status === filter)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpenId(null)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const act = async (status: BookingStatus) => {
    if (!open) return
    setBusy(true)
    setMsg('')
    const res = await fetch(`/api/bookings/${open.id}/status`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, internalNote: note }) })
    const body = (await res.json().catch(() => ({}))) as { mailed?: boolean }
    setBusy(false)
    if (!res.ok) return setMsg('ما زبط الحفظ. جرّب مرة ثانية.')
    setMsg(status === 'confirmed' || status === 'cancelled' ? (body.mailed ? 'انحفظ، وانبعت إيميل للزائر.' : 'انحفظ. الإيميل ما انبعت (إعدادات الإيميل ناقصة).') : 'انحفظ.')
    setOpenId(null)
    router.refresh()
  }

  const preview = open ? confirmedMail(open) : null
  return (
    <div className="suc-board" dir="rtl" lang="ar">
      <div className="suc-head">
        <div>
          <span className="suc-eyebrow">لوحة التحكم · الأدلاء</span>
          <h1>حجوزات الأدلاء</h1>
        </div>
        <a className="suc-btn ghost" href="/api/bookings/export" download>
          تصدير CSV
        </a>
      </div>
      <div className="suc-kpis">
        <div className="suc-kpi new"><b>{stats.new}</b><span>طلبات جديدة بانتظار الرد</span></div>
        <div className="suc-kpi"><b>{stats.confirmedThisWeek}</b><span>مؤكدة هالأسبوع</span></div>
        <div className="suc-kpi"><b>{stats.all}</b><span>كل الطلبات</span></div>
        <div className="suc-kpi"><b>{stats.guides}</b><span>أدلاء منشورين</span></div>
      </div>
      <div className="suc-filters" role="group" aria-label="فلتر الحالة">
        {[['', 'الكل'] as const, ...BOOKING_STATUSES.map((s) => [s, STATUS_LABELS[s].ar] as const)].map(([v, l]) => (
          <button key={v || 'all'} type="button" className="suc-pill" aria-pressed={filter === v} onClick={() => setFilter(v)}>
            {l}
          </button>
        ))}
      </div>
      {msg && <p className="suc-msg" role="status">{msg}</p>}
      {shown.length ? (
        <div className="suc-table">
          <table>
            <thead>
              <tr>
                <th>رقم الطلب</th><th>الحالة</th><th>الدليل</th><th>المشوار</th><th>التاريخ</th><th>الأشخاص</th><th>اللغة</th><th>الزائر</th><th>وصل</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr
                  key={r.id}
                  tabIndex={0}
                  onClick={() => {
                    setOpenId(r.id)
                    setNote(r.internalNote)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenId(r.id)
                      setNote(r.internalNote)
                    }
                  }}
                >
                  <td className="num">{r.code}</td>
                  <td><span className={`suc-st ${TONE[r.status]}`}>{STATUS_LABELS[r.status].ar}</span></td>
                  <td>{r.guideName}</td>
                  <td>{r.trip}</td>
                  <td className="num">{r.date}</td>
                  <td className="num">{r.people}</td>
                  <td>{TOUR_LANGUAGES[r.language as TourLanguage]?.ar ?? r.language}</td>
                  <td>{r.name}</td>
                  <td>{when(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="suc-empty">ما في طلبات {filter ? `بحالة "${STATUS_LABELS[filter].ar}"` : 'بعد'}.</p>
      )}
      <p className="suc-note">اضغط على أي طلب لتفتح تفاصيله وتأكّده أو تلغيه. كل طلب جديد بيبعت إيميل للعناوين بصفحة إشعارات الحجوزات.</p>

      {open && preview && (
        <>
          <div className="suc-scrim" onClick={() => setOpenId(null)} />
          <div className="suc-drawer" role="dialog" aria-modal="true" aria-label={`تفاصيل الطلب ${open.code}`}>
            <div className="suc-dh">
              <h2>طلب <span className="num">{open.code}</span></h2>
              <button type="button" className="suc-x" aria-label="إغلاق" onClick={() => setOpenId(null)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            </div>
            <span className={`suc-st ${TONE[open.status]}`}>{STATUS_LABELS[open.status].ar}</span>
            <dl>
              <dt>الدليل</dt><dd>{open.guideName}</dd>
              <dt>المشوار</dt><dd>{open.trip}</dd>
              <dt>التاريخ</dt><dd>{open.date}</dd>
              <dt>الأشخاص</dt><dd>{open.people}</dd>
              <dt>اللغة</dt><dd>{TOUR_LANGUAGES[open.language as TourLanguage]?.ar ?? open.language}</dd>
              <dt>الزائر</dt><dd>{open.name}</dd>
              <dt>واتساب</dt><dd dir="ltr">{open.phone || '—'}</dd>
              <dt>الإيميل</dt><dd dir="ltr">{open.email}</dd>
              <dt>ملاحظة</dt><dd>{open.note || '—'}</dd>
            </dl>
            <label className="suc-field">
              <span>ملاحظة داخلية (ما بيشوفها الزائر)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: حكينا الدليل، موافق" />
            </label>
            <div className="suc-actions">
              <button type="button" className="suc-btn" disabled={busy} onClick={() => act('confirmed')}>تأكيد وإرسال إيميل للزائر</button>
              <button type="button" className="suc-btn ghost bad" disabled={busy} onClick={() => act('cancelled')}>إلغاء الطلب</button>
              <button type="button" className="suc-btn ghost" disabled={busy} onClick={() => act('done')}>منجز</button>
            </div>
            <div className="suc-mail">
              <div className="h"><b>معاينة إيميل التأكيد:</b> {preview.subject}</div>
              <pre>{preview.text}</pre>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
