import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Brand, Mark } from '@/components/Logo'

describe('<Mark>', () => {
  const svg = renderToStaticMarkup(<Mark size={36} />)
  const tickPaths = [...svg.matchAll(/<path d="([^"]+)"[^>]*stroke-width="([\d.]+)"/g)].map((m) => ({ d: m[1]!, w: m[2]! }))

  it('draws 72 tick marks as two compact paths: 12 long (2.4) and 60 short (1.4)', () => {
    // Two paths instead of 72 <line> elements keeps every page's HTML small (it is repeated in the RSC payload).
    expect(tickPaths).toHaveLength(2)
    const count = (w: string) => tickPaths.find((p) => p.w === w)!.d.match(/M/g)!.length
    expect(count('2.4')).toBe(12)
    expect(count('1.4')).toBe(60)
    expect(svg.match(/<line /g)).toBeNull()
  })

  it('places the first long tick at 12 o’clock, from radius 42 to 49', () => {
    expect(tickPaths.find((p) => p.w === '2.4')!.d.startsWith('M0 -42L0 -49')).toBe(true)
  })

  it('has the focus ring, inner ring, copper centre and copper index rotated −38°', () => {
    expect(svg).toContain('<circle r="38"')
    expect(svg).toContain('<circle r="31"')
    expect(svg).toMatch(/<circle r="4.5" fill="#B5713A"/)
    expect(svg).toMatch(/<path [^>]*fill="#B5713A"[^>]*transform="rotate\(-38\)"/)
  })

  it('is decorative and sized as asked', () => {
    expect(svg).toContain('aria-hidden="true"')
    expect(svg).toContain('width="36"')
    expect(svg).toContain('height="36"')
  })

  it('stays small', () => {
    expect(svg.length).toBeLessThan(2500)
  })
})

describe('<Brand>', () => {
  it('renders the Arabic wordmark and the spaced Latin line as the link’s visible name', () => {
    const html = renderToStaticMarkup(<Brand href="/" />)
    expect(html).toContain('<b>سوريا عن قرب</b>')
    expect(html).toContain('<small>SYRIA UP CLOSE</small>')
    expect(html).toContain('href="/"')
    // No aria-label overriding the visible text (WCAG 2.5.3).
    expect(html).not.toContain('aria-label')
  })
})
