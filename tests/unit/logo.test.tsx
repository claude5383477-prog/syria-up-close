import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Brand, Mark } from '@/components/Logo'

describe('<Mark>', () => {
  const svg = renderToStaticMarkup(<Mark size={36} />)

  it('draws 72 tick marks, 12 of them long', () => {
    expect(svg.match(/<line /g)).toHaveLength(72)
    expect(svg.match(/stroke-width="2.4"/g)).toHaveLength(12)
    expect(svg.match(/stroke-width="1.4"/g)).toHaveLength(60)
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

  it('places the first tick at 12 o’clock', () => {
    expect(svg).toContain('<line x1="0.00" y1="-42.00" x2="0.00" y2="-49.00"')
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
