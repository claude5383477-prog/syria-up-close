'use client'

import { Children, useState, type ReactNode } from 'react'

/**
 * The first few cards of a long list, and a button for the rest (review 2026-10-26: shorter city pages).
 * Every card stays in the HTML for search engines and no-JS readers; CSS hides the rest until opened.
 */
export function ShowMore({ children, first = 6, className, more, less }: { children: ReactNode; first?: 6 | 8; className?: string; more: string; less: string }) {
  const [open, setOpen] = useState(false)
  const count = Children.count(children)
  return (
    <>
      <div className={[className, `sm${first}`, open ? '' : 'collapsed'].filter(Boolean).join(' ')}>{children}</div>
      <MoreButton count={count} first={first} open={open} setOpen={setOpen} more={more} less={less} />
    </>
  )
}

export function MoreButton({ count, first, open, setOpen, more, less }: { count: number; first: number; open: boolean; setOpen: (v: boolean) => void; more: string; less: string }) {
  if (count <= first) return null
  return (
    <button type="button" className="show-more" aria-expanded={open} onClick={() => setOpen(!open)}>
      {open ? less : more.replace('{n}', String(count))}
    </button>
  )
}
