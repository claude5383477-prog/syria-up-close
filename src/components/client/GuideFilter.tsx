'use client'

import { useState, type ReactNode } from 'react'

export type GuideItem = { key: string; city: string; langs: string[]; node: ReactNode }

/** City and language filter over the server-rendered guide cards (/guides). */
export function GuideFilter({
  items,
  cities,
  langs,
  text,
  empty,
}: {
  items: GuideItem[]
  cities: { value: string; label: string }[]
  langs: { value: string; label: string }[]
  text: { city: string; lang: string; all: string; count: string; none: string }
  empty: ReactNode
}) {
  const [city, setCity] = useState('')
  const [lang, setLang] = useState('')
  const shown = items.filter((i) => (!city || i.city === city) && (!lang || i.langs.includes(lang)))
  return (
    <>
      <div className="filters">
        <label htmlFor="fcity" className="eyebrow">
          {text.city}
        </label>
        <select id="fcity" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">{text.all}</option>
          {cities.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <label htmlFor="flang" className="eyebrow">
          {text.lang}
        </label>
        <select id="flang" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="">{text.all}</option>
          {langs.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="muted count" aria-live="polite">
          {text.count.replace('{n}', String(shown.length))}
        </span>
      </div>
      <div className="grid3">
        {shown.map((i) => (
          <div key={i.key} className="fi">
            {i.node}
          </div>
        ))}
        {!items.length && empty}
      </div>
      {items.length > 0 && !shown.length && <p className="muted">{text.none}</p>}
    </>
  )
}
