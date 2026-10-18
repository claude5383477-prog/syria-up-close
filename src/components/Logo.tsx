import Link from 'next/link'
import { Mark } from './Mark'

export { Mark }

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
