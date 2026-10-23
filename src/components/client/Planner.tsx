'use client'

import { useState, type ReactNode } from 'react'
import { INTERESTS, planTrip, type Interest } from '@/lib/tripPlan'

type Labels = { days: string; interests: string; head: (d: number) => string; nights: (n: number) => string; stay: string; note: string; dayLabel: (d: number) => string }

const NIGHTS = {
  ar: (n: number) => (n === 1 ? 'ليلة واحدة' : n === 2 ? 'ليلتان' : `${n} ليالٍ`),
  en: (n: number) => (n === 1 ? '1 night' : `${n} nights`),
}

/** "Plan your trip": choose days and interests, see an order of cities with a stay per stop (lib/tripPlan). */
export function Planner({
  locale,
  cityNames,
  interestLabels,
  stayHref,
  stayHrefs,
  text,
  intro,
}: {
  locale: 'ar' | 'en'
  cityNames: Record<string, string>
  interestLabels: Record<Interest, string>
  stayHref: string
  /** The Ahleen page of each city, when known (falls back to stayHref). */
  stayHrefs: Record<string, string>
  text: { days: string; interests: string; head: string; stay: string; note: string; dayUnit: string }
  /** Heading and lede shown above the controls. */
  intro?: ReactNode
}) {
  const [days, setDays] = useState(5)
  const [picked, setPicked] = useState<Interest[]>(['history', 'nature'])
  const plan = planTrip(days, picked)
  const t: Labels = {
    days: text.days,
    interests: text.interests,
    head: (d) => text.head.replace('{d}', String(d)),
    nights: NIGHTS[locale],
    stay: text.stay,
    note: text.note,
    dayLabel: (d) => `${d} ${text.dayUnit}`,
  }
  return (
    <div className="planner">
      <div className="stack">
        {intro}
        <b>{t.days}</b>
        <div className="pills" role="group" aria-label={t.days}>
          {[3, 5, 7, 10].map((d) => (
            <button key={d} type="button" className="pill" aria-pressed={d === days} onClick={() => setDays(d)}>
              {t.dayLabel(d)}
            </button>
          ))}
        </div>
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
        <span className="kicker">{t.head(days)}</span>
        {plan.map((s, i) => (
          <div className="stop" key={s.slug}>
            <span className="num">{i + 1}</span>
            <span className="stack" style={{ gap: 2 }}>
              <b>{cityNames[s.slug] ?? s.slug}</b>
              <span>{t.nights(s.nights)}</span>
              <a className="link" href={stayHrefs[s.slug] ?? stayHref} target="_blank" rel="noopener" style={{ justifySelf: 'start', fontSize: 14 }}>
                {t.stay}
              </a>
            </span>
          </div>
        ))}
        <span className="cap">{t.note}</span>
      </div>
    </div>
  )
}
