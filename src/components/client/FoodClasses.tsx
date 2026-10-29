'use client'

import { useState, type ReactNode } from 'react'
import { MoreButton } from '@/components/client/ShowMore'
import type { VenueCategory, VenueSubcategory } from '@/lib/venueClass'

export type FoodItem = { key: string; category: VenueCategory; subcategory?: VenueSubcategory | null; node: ReactNode }
type Sub = { value: VenueSubcategory; label: string; count: number; slot: ReactNode }
export type FoodClass = { value: VenueCategory; name: string; desc: string; count: number; subs: Sub[] }

const ICON: Record<VenueCategory, ReactNode> = {
  tourist: <path d="M3 21h18M5 21V10a7 7 0 0 1 14 0v11M9 21v-5a3 3 0 0 1 6 0v5" />,
  popular: <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9" />,
}

/**
 * Restaurants by class, then by section (batch 4, prototype "صفحة المدينة · دمشق"): two class cards, the
 * sections with their counts, then the cards. A section with no place yet shows a dashed "awaiting the
 * correspondent" card. Every card is in the HTML; the buttons only choose what shows.
 */
export function FoodClasses({
  classes,
  items,
  initial,
  label,
  subLabel,
  all,
  more,
  less,
}: {
  classes: FoodClass[]
  items: FoodItem[]
  initial: VenueCategory
  label: string
  subLabel: string
  all: string
  more: string
  less: string
}) {
  const [cat, setCat] = useState<VenueCategory>(initial)
  const [sub, setSub] = useState<VenueSubcategory | ''>('')
  const [open, setOpen] = useState(false)
  const current = classes.find((c) => c.value === cat) ?? classes[0]!
  const shown = items.filter((i) => i.category === cat && (!sub || i.subcategory === sub))
  // Dashed cards: every empty section under "all", or the chosen section when it is empty.
  const slots = current.subs.filter((s) => s.count === 0 && (!sub || s.value === sub))
  const total = shown.length + slots.length
  return (
    <>
      <div className="food-kind" role="group" aria-label={label}>
        {classes.map((c) => (
          <button
            key={c.value}
            type="button"
            className="kind-btn"
            aria-pressed={c.value === cat}
            onClick={() => {
              setCat(c.value)
              setSub('')
              setOpen(false)
            }}
          >
            <span className="ic" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {ICON[c.value]}
              </svg>
            </span>
            <span>
              <b>
                {c.name} <span className="n">({c.count})</span>
              </b>
              <span>{c.desc}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="subs scroll-x" role="group" aria-label={subLabel}>
        {[{ value: '' as const, label: all, count: current.count }, ...current.subs].map((s) => (
          <button
            key={s.value || 'all'}
            type="button"
            className="pill"
            aria-pressed={s.value === sub}
            onClick={() => {
              setSub(s.value)
              setOpen(false)
            }}
          >
            {s.label} <span className="n">{s.count}</span>
          </button>
        ))}
      </div>
      <div className={['venue-grid', 'sm6', open ? '' : 'collapsed'].filter(Boolean).join(' ')}>
        {shown.map((i) => (
          <div key={i.key} className="fi">
            {i.node}
          </div>
        ))}
        {slots.map((s) => (
          <div key={`slot-${s.value}`} className="fi">
            {s.slot}
          </div>
        ))}
      </div>
      <MoreButton count={total} first={6} open={open} setOpen={setOpen} more={more} less={less} />
    </>
  )
}
