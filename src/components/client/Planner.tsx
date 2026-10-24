'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { buildDays, clampDays, INTERESTS, MAX_DAYS, planTrip, ROUTE, type CityPack, type DayItem, type Interest } from '@/lib/tripPlan'

/** Labels from the server; `{d}`, `{n}`, `{city}`, `{from}`, `{name}`, `{dish}` are filled in here. */
export type PlannerText = {
  days: string
  interests: string
  cities: string
  citiesAuto: string
  citiesOn: string
  citiesCap: string
  other: string
  otherLabel: string
  otherHint: string
  head: string
  total: string
  pickOne: string
  stay: string
  note: string
  day: string
  slots: [string, string, string]
  arrive: string
  move: string
  free: [string, string, string]
  dine: string
  taste: string
  tryDish: string
  where: string
  pdf: string
  pdfHint: string
  docTitle: string
  docNote: string
  docAhleen: string
  docSite: string
  docPage: string
}

const DAYS_WORD = {
  ar: (n: number) => (n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : n <= 10 ? `${n} أيام` : `${n} يوماً`),
  en: (n: number) => (n === 1 ? '1 day' : `${n} days`),
}

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''))

function Lens({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="29" fill="none" stroke="#E8DCC8" strokeWidth="2" />
      <circle cx="32" cy="32" r="23.5" fill="none" stroke="#E8DCC8" strokeWidth="3.5" strokeDasharray="1.2 3.9" />
      <path d="M28.5 0 L35.5 0 L32 7 Z" fill="#D9A06E" />
      <circle cx="32" cy="32" r="11" fill="none" stroke="#D9A06E" strokeWidth="1.6" />
      <circle cx="32" cy="32" r="4.5" fill="#D9A06E" />
    </svg>
  )
}

/**
 * "Plan your trip": days (or any number up to a month), interests or the reader's own cities, then
 * the trip day by day from the site's content (lib/tripPlan), and a branded PDF of it through the
 * browser's own "save as PDF", so the links in it stay clickable.
 */
export function Planner({
  locale,
  cityNames,
  interestLabels,
  stayHref,
  stayHrefs,
  packs,
  text: t,
  intro,
  madeOn,
}: {
  locale: 'ar' | 'en'
  cityNames: Record<string, string>
  interestLabels: Record<Interest, string>
  stayHref: string
  /** The Ahleen page of each city, when known (falls back to stayHref). */
  stayHrefs: Record<string, string>
  packs: Record<string, CityPack>
  text: PlannerText
  /** Heading and lede shown above the controls. */
  intro?: ReactNode
  /** Today's date, worded, for the PDF. */
  madeOn: string
}) {
  const [days, setDays] = useState(7)
  const [custom, setCustom] = useState(false)
  const [picked, setPicked] = useState<Interest[]>(['history'])
  const [cities, setCities] = useState<string[]>([])
  const [printing, setPrinting] = useState(false)
  const word = DAYS_WORD[locale]
  const plan = planTrip(days, picked, cities, Object.keys(packs))
  const planDays = buildDays(plan, packs)
  const choosable = (ROUTE as readonly string[]).filter((s) => packs[s]?.sights.length && cityNames[s])
  const name = (slug: string) => cityNames[slug] ?? slug
  const stayFor = (slug: string) => stayHrefs[slug] ?? stayHref

  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done)
    const id = window.setTimeout(() => window.print(), 50)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('afterprint', done)
    }
  }, [printing])

  const itemText = (slug: string, it: DayItem): { title: string; sub?: string; href?: string } => {
    switch (it.kind) {
      case 'arrive':
        return { title: fill(t.arrive, { city: name(slug) }) }
      case 'move':
        return {
          title: fill(t.move, { from: name(it.from), city: name(slug) }),
        }
      case 'sight':
        return { title: it.name, sub: it.note, href: it.href }
      case 'dine':
        return {
          title: fill(t.dine, { name: it.name }),
          sub: [it.hood, it.dish && fill(t.tryDish, { dish: it.dish })].filter(Boolean).join(' · '),
          href: it.href,
        }
      case 'taste':
        return { title: fill(t.taste, { dish: it.dish }) }
      default:
        return { title: fill(t.free[it.slot], { city: name(slug) }) }
    }
  }

  const citiesHint = !cities.length ? t.citiesAuto : cities.length > days ? fill(t.citiesCap, { n: days }) : fill(t.citiesOn, { n: cities.length })
  const head = fill(t.head, { d: word(days) })

  // The PDF: A4 pages laid out here (3 days on the first, 4 after) so the partner corner sits on each.
  const pages = [planDays.slice(0, 3), ...Array.from({ length: Math.ceil(Math.max(0, planDays.length - 3) / 4) }, (_, i) => planDays.slice(3 + i * 4, 7 + i * 4))]
  const docTitle = fill(t.docTitle, { d: word(days) })
  const doc = (
    <div className="plan-doc" dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
      {pages.map((chunk, pi) => (
        <div className="pd-page" key={pi}>
          {pi === 0 ? (
            <>
              <header className="pd-head">
                <Lens size={44} />
                <span className="pd-brand">
                  <b>سوريا عن قرب</b>
                  <small>SYRIA UP CLOSE</small>
                </span>
                <span className="pd-title">
                  <span>{picked.map((i) => interestLabels[i]).join(' · ') || t.cities}</span>
                  <b>{docTitle}</b>
                </span>
              </header>
              <div className="pd-band" />
              <div className="pd-chips">
                {plan.map((s, i) => (
                  <span key={s.slug}>
                    {i + 1} · {name(s.slug)} · {word(s.days)}
                  </span>
                ))}
              </div>
              <p className="pd-meta">
                {madeOn} · {t.docNote}
              </p>
            </>
          ) : (
            <header className="pd-slim">
              <Lens size={28} />
              <b>سوريا عن قرب</b>
              <span>
                {docTitle} · {fill(t.docPage, { n: pi + 1 })}
              </span>
            </header>
          )}
          <div className="pd-days">
            {chunk.map((d) => (
              <section className="pd-day" key={d.n}>
                <div className="pd-dh">
                  <span className="pd-num">{fill(t.day, { n: d.n })}</span>
                  <span className="pd-city">{name(d.slug)}</span>
                  <a href={stayFor(d.slug)}>{fill(t.stay, { city: name(d.slug) })}</a>
                </div>
                {d.items.map((it, i) => {
                  const x = itemText(d.slug, it)
                  return (
                    <div className="pd-it" key={i}>
                      <span className="pd-tm">{t.slots[it.slot]}</span>
                      <span className="pd-tx">
                        <b>{x.title}</b>
                        {x.sub && <span>{x.sub}</span>}
                      </span>
                      {x.href && <a href={x.href}>{t.where}</a>}
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
          <footer className="pd-foot">
            <span>{t.docSite}</span>
            <span className="pd-ahleen">
              <a href={stayHref} className="pd-logo">
                <Image src="/brand/ahleen-cream.svg" alt="Ahleen" width={52} height={30} unoptimized />
              </a>
              <a href={stayHref}>
                {t.docAhleen}
                <br />
                ahleenbooking.com ↗
              </a>
            </span>
          </footer>
        </div>
      ))}
    </div>
  )

  return (
    <div className="planner">
      <div className="stack">
        {intro}
        <b>{t.days}</b>
        <div className="pills" role="group" aria-label={t.days}>
          {[3, 5, 7, 10].map((d) => (
            <button
              key={d}
              type="button"
              className="pill"
              aria-pressed={!custom && d === days}
              onClick={() => {
                setCustom(false)
                setDays(d)
              }}
            >
              {word(d)}
            </button>
          ))}
          <button
            type="button"
            className="pill"
            aria-pressed={custom}
            onClick={() => {
              setCustom(true)
              setDays(14)
            }}
          >
            {t.other}
          </button>
        </div>
        {custom && (
          <div className="days-other">
            <label htmlFor="days-other">{t.otherLabel}</label>
            <input id="days-other" type="number" inputMode="numeric" min={2} max={MAX_DAYS} value={days} onChange={(e) => setDays(clampDays(Number(e.target.value)))} />
            <span>{t.otherHint}</span>
          </div>
        )}
        <b>{t.cities}</b>
        <div className="pills" role="group" aria-label={t.cities}>
          {choosable.map((s) => {
            const on = cities.includes(s)
            return (
              <button key={s} type="button" className="pill" aria-pressed={on} onClick={() => setCities(on ? cities.filter((x) => x !== s) : [...cities, s])}>
                {name(s)}
              </button>
            )
          })}
        </div>
        <span className="cap">{citiesHint}</span>
        <b>{t.interests}</b>
        <div className="pills" role="group" aria-label={t.interests}>
          {INTERESTS.map((i) => {
            const on = picked.includes(i)
            return (
              <button key={i} type="button" className="pill" aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== i) : [...picked, i])}>
                {interestLabels[i]}
              </button>
            )
          })}
        </div>
      </div>
      <div className="plan" aria-live="polite">
        <div className="plan-top">
          <span className="kicker">{head}</span>
          <button type="button" className="pdf-btn" onClick={() => setPrinting(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            {t.pdf}
          </button>
        </div>
        <span className="cap">{t.pdfHint}</span>
        <div className="stops">
          {plan.map((s, i) => (
            <span className="chip-stop" key={s.slug}>
              <b>{i + 1}</b> {name(s.slug)} · {word(s.days)}
            </span>
          ))}
        </div>
        <div className="day-list">
          {planDays.map((d) => (
            <div className="day-card" key={d.n}>
              <div className="dh">
                <span className="num">{fill(t.day, { n: d.n })}</span>
                <b>{name(d.slug)}</b>
                <a className="where" href={stayFor(d.slug)} target="_blank" rel="noopener">
                  {fill(t.stay, { city: name(d.slug) })}
                </a>
              </div>
              {d.items.map((it, i) => {
                const x = itemText(d.slug, it)
                return (
                  <div className="it" key={i}>
                    <span className="tm">{t.slots[it.slot]}</span>
                    <span className="tx">
                      <b>{x.title}</b>
                      {x.sub && <span>{x.sub}</span>}
                    </span>
                    {x.href && (
                      <a className="where" href={x.href} target="_blank" rel="noopener">
                        {t.where}
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <b className="total">{plan.length && (picked.length || cities.length) ? fill(t.total, { d: word(planDays.length) }) : t.pickOne}</b>
        <span className="cap">{t.note}</span>
      </div>
      {printing && createPortal(doc, document.body)}
    </div>
  )
}
