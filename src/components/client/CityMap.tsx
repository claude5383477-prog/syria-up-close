'use client'

import Link from 'next/link'
import { useState, type CSSProperties } from 'react'

export type MapCity = {
  slug: string
  name: string
  tag: string
  lede: string
  href: string
  x: number
  y: number
}

const BIG = ['damascus', 'aleppo', 'homs', 'latakia']

/**
 * The home hero's flat map of Syria: the outline (lib/geo) with each city's name at its place.
 * Picking a name moves the lens (the brand mark) onto the city and shows its card.
 */
export function CityMap({ cities, outline, open, note, label }: { cities: MapCity[]; outline: string; open: string; note: string; label: string }) {
  const [sel, setSel] = useState(cities[0]?.slug ?? '')
  const city = cities.find((c) => c.slug === sel) ?? cities[0]
  const pick = (slug: string) => () => setSel(slug)

  return (
    <div className="citymap" role="group" aria-label={label}>
      <div className="board">
        <div className="inner">
          <svg className="land" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d={outline} />
          </svg>
          {city && (
            <span className="cm-lens" style={{ left: `${city.x}%`, top: `${city.y}%` }} aria-hidden="true">
              <svg viewBox="0 0 64 64" width="100%" height="100%">
                <circle cx="32" cy="32" r="30" className="ring" />
                <g className="ticks">
                  <circle cx="32" cy="32" r="25" />
                </g>
                <circle cx="32" cy="32" r="2.6" className="cu" />
              </svg>
            </span>
          )}
          {cities.map((c) => (
              <button
                key={c.slug}
                type="button"
                className={BIG.includes(c.slug) ? 'cname big' : 'cname'}
                style={{ left: `${c.x}%`, top: `${c.y}%` } as CSSProperties}
                aria-pressed={c.slug === sel}
                onClick={pick(c.slug)}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setSel(c.slug)}
                onFocus={pick(c.slug)}
              >
                {c.name}
              </button>
            ))}
        </div>
        {city && (
          <div className="card3" aria-live="polite">
            <span className="t">{city.tag}</span>
            <b>{city.name}</b>
            <span className="lede">{city.lede}</span>
            <Link href={city.href}>{open}</Link>
          </div>
        )}
      </div>
      <p className="note3">{note}</p>
    </div>
  )
}
