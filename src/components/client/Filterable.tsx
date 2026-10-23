'use client'

import { useState, type ReactNode } from 'react'

export type FilterItem = { key: string; tags: string[]; node: ReactNode }

/**
 * A row of filter pills over server-rendered items (trips by city, venue kinds, blog categories).
 * Every item is in the HTML for search engines and no-JS readers; the pills only hide the rest.
 */
export function Filterable({
  label,
  all,
  options,
  items,
  empty,
  className,
  sticky,
  head,
}: {
  label: string
  all: string
  options: { value: string; label: string }[]
  items: FilterItem[]
  empty?: ReactNode
  className?: string
  sticky?: boolean
  /** Shown between the pills and the items (a section heading under a sticky bar). */
  head?: ReactNode
}) {
  const [on, setOn] = useState('')
  const shown = items.filter((i) => !on || i.tags.includes(on))
  const pills = (
    <div className="pills scroll-x" role="group" aria-label={label}>
      {[{ value: '', label: all }, ...options].map((o) => (
        <button key={o.value || 'all'} type="button" className="pill" aria-pressed={o.value === on} onClick={() => setOn(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
  return (
    <>
      {sticky ? <div className="sticky-bar">{pills}</div> : pills}
      {head}
      <div className={className} style={{ marginTop: 20 }}>
        {shown.length ? shown.map((i) => <div key={i.key} style={{ display: 'contents' }}>{i.node}</div>) : empty}
      </div>
    </>
  )
}
