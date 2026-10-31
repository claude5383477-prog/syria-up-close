'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

const ARROW = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

/**
 * The "انتقل إلى" row on city and trip pages (owner, 2026-10-29: it could not be moved with a mouse).
 * Phones swipe it as before; on a computer the arrows, the mouse wheel and dragging move it. The arrows
 * show only while there is more to see that way.
 */
export function TabsRow({ children, prev, next }: { children: ReactNode; prev: string; next: string }) {
  const row = useRef<HTMLDivElement>(null)
  const [ends, setEnds] = useState({ start: true, end: true })

  useEffect(() => {
    const el = row.current
    if (!el) return
    // scrollLeft is 0 at the start and negative towards the end in RTL, positive in LTR.
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      const pos = Math.abs(el.scrollLeft)
      setEnds({ start: pos <= 2, end: pos >= max - 2 })
    }
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return
      e.preventDefault()
      el.scrollBy({ left: getComputedStyle(el).direction === 'rtl' ? -e.deltaY : e.deltaY })
    }
    let drag: { x: number; left: number; moved: boolean } | null = null
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, left: el.scrollLeft, moved: false }
    }
    const move = (e: PointerEvent) => {
      if (!drag) return
      const dx = e.clientX - drag.x
      if (Math.abs(dx) > 4) drag.moved = true
      el.scrollLeft = drag.left - dx
    }
    const up = () => {
      // A drag must not open the link it started on.
      if (drag?.moved) el.addEventListener('click', (ev) => ev.preventDefault(), { capture: true, once: true })
      drag = null
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Towards the start (+1) or the end (-1) of the row, a little less than its visible width.
  const go = (to: 1 | -1) => {
    const el = row.current
    if (!el) return
    const rtl = getComputedStyle(el).direction === 'rtl'
    el.scrollBy({ left: (rtl ? to : -to) * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div className="wrap tabs-row">
      {!ends.start && (
        <button type="button" className="tabs-arrow prev" aria-label={prev} onClick={() => go(1)}>
          {ARROW('M9 6l6 6-6 6')}
        </button>
      )}
      <div className="scroll-x tabs-track" ref={row}>
        {children}
      </div>
      {!ends.end && (
        <button type="button" className="tabs-arrow next" aria-label={next} onClick={() => go(-1)}>
          {ARROW('M15 6l-6 6 6 6')}
        </button>
      )}
    </div>
  )
}
