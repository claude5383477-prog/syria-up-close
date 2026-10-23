'use client'

import Link from 'next/link'
import { useState, type CSSProperties, type PointerEvent } from 'react'

export type MapCity = { slug: string; name: string; tag: string; lede: string; href: string; x: number; y: number }

/**
 * The home hero's tilted map of Syria: the outline (lib/geo) and one pin per city. The plane turns
 * with the pointer; a pin is a button that selects its city, and the card links to the city page.
 */
export function Map3D({ cities, outline, open, note, label }: { cities: MapCity[]; outline: string; open: string; note: string; label: string }) {
  const [sel, setSel] = useState(cities[0]?.slug ?? '')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const city = cities.find((c) => c.slug === sel) ?? cities[0]

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 16, y: ((e.clientY - r.top) / r.height - 0.5) * -12 })
  }
  const vars = { '--tx': `${tilt.x}deg`, '--ty': `${tilt.y}deg` } as CSSProperties

  return (
    <div className="map3d g-anim" style={vars} onPointerMove={move} onPointerLeave={() => setTilt({ x: 0, y: 0 })} role="group" aria-label={label}>
      <p className="note3">{note}</p>
      <div className="plane">
        <svg className="land" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="shadow" d={outline} />
          <path d={outline} />
        </svg>
        {cities.map((c) => (
          <button
            key={c.slug}
            type="button"
            className="pin"
            style={{ '--x': `${c.x}%`, '--y': `${c.y}%`, zIndex: Math.round(c.y) } as CSSProperties}
            aria-pressed={c.slug === sel}
            onClick={() => setSel(c.slug)}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setSel(c.slug)}
          >
            <span className="lbl">{c.name}</span>
            <span className="beam" aria-hidden="true" />
            <span className="dot" aria-hidden="true" />
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
  )
}
