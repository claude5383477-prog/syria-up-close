import Link from 'next/link'

// Logo A (Brand v0.1): focus ring with 72 tick marks, copper index at −38°, copper focus point.
// Geometry ported from mark() in docs/source/syria-up-close.html.
const COPPER = '#B5713A'

// 1-decimal coordinates are invisible at any rendered size; "-0" is normalised to "0".
const n = (v: number) => String(Math.round(v * 10) / 10 || 0)

/**
 * The 72 ticks as two path strings (12 long, 60 short) rather than 72 <line> elements: every page
 * renders several marks and Next repeats the markup in its RSC payload, so this keeps HTML small.
 */
const TICKS = (() => {
  const paths = { long: '', short: '' }
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180
    const long = i % 6 === 0
    const r1 = long ? 42 : 44
    const seg = `M${n(r1 * Math.sin(a))} ${n(-r1 * Math.cos(a))}L${n(49 * Math.sin(a))} ${n(-49 * Math.cos(a))}`
    if (long) paths.long += seg
    else paths.short += seg
  }
  return paths
})()

export function Mark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-58 -58 116 116"
      aria-hidden="true"
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      <path d={TICKS.long} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d={TICKS.short} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle r="38" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <circle r="31" fill="none" stroke="currentColor" strokeWidth="1" opacity=".55" />
      <circle r="4.5" fill={COPPER} />
      <path d="M-4.5 -57 L4.5 -57 L0 -51 Z" fill={COPPER} transform="rotate(-38)" />
    </svg>
  )
}

/** Home link; its accessible name is the visible wordmark (WCAG 2.5.3 label-in-name). */
export function Brand({ href, size = 36, className, prefetch }: { href: string; size?: number; className?: string; prefetch?: boolean }) {
  return (
    <Link className={className ? `brand ${className}` : 'brand'} href={href} prefetch={prefetch}>
      <Mark size={size} />
      <span className="wm">
        <b>سوريا عن قرب</b>
        <small>SYRIA UP CLOSE</small>
      </span>
    </Link>
  )
}
