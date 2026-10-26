'use client'

import { useState, type ReactNode } from 'react'
import { MoreButton } from '@/components/client/ShowMore'

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
  first,
  more = '',
  less = '',
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
  /** Show this many, then a "show all" button (the rest stay in the HTML, hidden by CSS). */
  first?: 6 | 8
  more?: string
  less?: string
}) {
  const [on, setOn] = useState('')
  const [open, setOpen] = useState(false)
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
      <div className={[className, first ? `sm${first}` : '', first && !open ? 'collapsed' : ''].filter(Boolean).join(' ')} style={{ marginTop: 20 }}>
        {shown.length ? shown.map((i) => <div key={i.key} className="fi">{i.node}</div>) : empty}
      </div>
      {first && <MoreButton count={shown.length} first={first} open={open} setOpen={setOpen} more={more} less={less} />}
    </>
  )
}
