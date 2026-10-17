import Link from 'next/link'

// Logo A (Brand v0.1): focus ring with 72 tick marks, copper index at −38°, copper focus point.
// Geometry ported from mark() in docs/source/syria-up-close.html.
const COPPER = '#B5713A'

const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = (i * 5 * Math.PI) / 180
  const long = i % 6 === 0
  const r1 = long ? 42 : 44
  const r2 = 49
  return {
    x1: (r1 * Math.sin(a)).toFixed(2),
    y1: (-r1 * Math.cos(a)).toFixed(2),
    x2: (r2 * Math.sin(a)).toFixed(2),
    y2: (-r2 * Math.cos(a)).toFixed(2),
    w: long ? 2.4 : 1.4,
  }
})

export function Mark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-58 -58 116 116"
      aria-hidden="true"
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {TICKS.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="currentColor" strokeWidth={t.w} strokeLinecap="round" />
      ))}
      <circle r="38" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <circle r="31" fill="none" stroke="currentColor" strokeWidth="1" opacity=".55" />
      <circle r="4.5" fill={COPPER} />
      <path d="M-4.5 -57 L4.5 -57 L0 -51 Z" fill={COPPER} transform="rotate(-38)" />
    </svg>
  )
}

/** Home link; its accessible name is the visible wordmark (WCAG 2.5.3 label-in-name). */
export function Brand({ href, size = 36, className }: { href: string; size?: number; className?: string }) {
  return (
    <Link className={className ? `brand ${className}` : 'brand'} href={href}>
      <Mark size={size} />
      <span className="wm">
        <b>سوريا عن قرب</b>
        <small>SYRIA UP CLOSE</small>
      </span>
    </Link>
  )
}
