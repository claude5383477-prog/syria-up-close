'use client'

import { useState, type FormEvent } from 'react'

export type BookingText = {
  title: string
  trip: string
  custom: string
  date: string
  people: string
  language: string
  name: string
  phone: string
  email: string
  note: string
  notePh: string
  consent: string
  submit: string
  sending: string
  noPay: string
  done: string
  code: string
  doneNote: string
  again: string
  errors: Record<string, string>
  failed: string
  rate: string
}

const FIELDS = ['trip', 'date', 'people', 'language', 'name', 'phone', 'email', 'note', 'consent'] as const

/**
 * The guide booking form (batch 4). Posts to /api/bookings/request; the server checks everything again.
 * `website` is a honeypot: hidden from people and screen readers, filled only by bots.
 */
export function BookingForm({ guide, trips, languages, t }: { guide: number; trips: { id: string; label: string }[]; languages: { value: string; label: string }[]; t: BookingText }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [code, setCode] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [failed, setFailed] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const body = Object.fromEntries(FIELDS.map((k) => [k, form.get(k) ?? '']))
    body.consent = form.get('consent') === 'on' ? 'on' : ''
    const local = FIELDS.filter((k) => (k === 'name' || k === 'email' || k === 'date') && !String(body[k]).trim())
    if (!body.consent) local.push('consent')
    if (local.length) return setErrors(local)
    setErrors([])
    setFailed('')
    setState('sending')
    try {
      const res = await fetch('/api/bookings/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, guide, people: Number(body.people), website: form.get('website') ?? '' }),
      })
      const json = (await res.json().catch(() => ({}))) as { code?: string | null; fields?: string[]; error?: string }
      if (res.ok) {
        setCode(json.code ?? null)
        setState('done')
        return
      }
      setState('idle')
      if (json.fields) setErrors(json.fields)
      else setFailed(json.error === 'rate' ? t.rate : t.failed)
    } catch {
      setState('idle')
      setFailed(t.failed)
    }
  }

  if (state === 'done')
    return (
      <div className="done" role="status">
        <b>{t.done}</b>
        {code && (
          <span>
            {t.code} <span className="code">{code}</span>
          </span>
        )}
        <span className="muted">{t.doneNote}</span>
        <button type="button" className="btn-pill small ghost" onClick={() => setState('idle')}>
          {t.again}
        </button>
      </div>
    )

  const err = (k: string) => (errors.includes(k) ? <span className="err" id={`b-${k}-err`}>{t.errors[k]}</span> : null)
  const inv = (k: string) => (errors.includes(k) ? { 'aria-invalid': true, 'aria-describedby': `b-${k}-err` } : {})
  return (
    <form className="book" onSubmit={submit} noValidate>
      <h2>{t.title}</h2>
      <div className="field">
        <label htmlFor="b-trip">{t.trip}</label>
        <select id="b-trip" name="trip" {...inv('trip')}>
          {trips.map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.label}
            </option>
          ))}
          <option value="__custom">{t.custom}</option>
        </select>
        {err('trip')}
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="b-date">{t.date}</label>
          <input id="b-date" name="date" type="date" min={today} required {...inv('date')} />
          {err('date')}
        </div>
        <div className="field">
          <label htmlFor="b-people">{t.people}</label>
          <input id="b-people" name="people" type="number" min={1} max={30} defaultValue={2} required {...inv('people')} />
          {err('people')}
        </div>
      </div>
      <div className="field">
        <label htmlFor="b-language">{t.language}</label>
        <select id="b-language" name="language" {...inv('language')}>
          {languages.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        {err('language')}
      </div>
      <div className="field">
        <label htmlFor="b-name">{t.name}</label>
        <input id="b-name" name="name" autoComplete="name" required maxLength={80} {...inv('name')} />
        {err('name')}
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="b-phone">{t.phone}</label>
          <input id="b-phone" name="phone" type="tel" dir="ltr" autoComplete="tel" placeholder="+963…" maxLength={24} {...inv('phone')} />
          {err('phone')}
        </div>
        <div className="field">
          <label htmlFor="b-email">{t.email}</label>
          <input id="b-email" name="email" type="email" dir="ltr" autoComplete="email" required {...inv('email')} />
          {err('email')}
        </div>
      </div>
      <div className="field">
        <label htmlFor="b-note">{t.note}</label>
        <textarea id="b-note" name="note" maxLength={1000} placeholder={t.notePh} />
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="b-website">Website</label>
        <input id="b-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="check">
        <input id="b-consent" name="consent" type="checkbox" required {...inv('consent')} /> <span>{t.consent}</span>
      </label>
      {err('consent')}
      {failed && (
        <p className="err" role="alert">
          {failed}
        </p>
      )}
      <button className="btn-pill" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? t.sending : t.submit}
      </button>
      <span className="muted small">{t.noPay}</span>
    </form>
  )
}
