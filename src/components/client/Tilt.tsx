'use client'

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react'

/**
 * Tilts its children in 3D with the mouse by setting --rx/--ry (degrees) and --mx/--my (light
 * position) on itself; the stylesheet decides what moves. Touch and keyboard users see it at rest.
 */
export function Tilt({ className, strength = 24, children }: { className?: string; strength?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (vars: Record<string, string>) => {
    for (const [k, v] of Object.entries(vars)) ref.current?.style.setProperty(k, v)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    set({ '--ry': `${(px - 0.5) * strength}deg`, '--rx': `${(py - 0.5) * -strength * 0.6}deg`, '--mx': `${px * 100}%`, '--my': `${py * 100}%` })
  }
  const reset = () => set({ '--ry': '0deg', '--rx': '0deg', '--mx': '50%', '--my': '30%' })
  return (
    <div ref={ref} className={className ? `${className} g-anim` : 'g-anim'} style={{} as CSSProperties} onPointerMove={move} onPointerLeave={reset}>
      {children}
    </div>
  )
}
