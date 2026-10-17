import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ButtonLink, Card, Chip, PhotoPlaceholder, SoonTag, StayCard } from '@/components/ui'

const html = (el: React.ReactElement) => renderToStaticMarkup(el)

describe('primitives keep the prototype class names', () => {
  it('ButtonLink: solid and ghost', () => {
    expect(html(<ButtonLink href="/x">Go</ButtonLink>)).toBe('<a class="btn" href="/x">Go</a>')
    expect(html(<ButtonLink href="/x" ghost>Go</ButtonLink>)).toContain('class="btn ghost"')
  })

  it('Chip kinds', () => {
    expect(html(<Chip kind="city">دمشق</Chip>)).toBe('<span class="chip city">دمشق</span>')
    expect(html(<Chip kind="cat">x</Chip>)).toContain('class="chip cat"')
    expect(html(<Chip kind="aud">x</Chip>)).toContain('class="chip aud"')
  })

  it('PhotoPlaceholder exposes the shot note as the accessible name', () => {
    const out = html(<PhotoPlaceholder shot="ضوء على بلاط باب توما" tall />)
    expect(out).toContain('class="ph tall"')
    expect(out).toContain('role="img"')
    expect(out).toContain('aria-label="ضوء على بلاط باب توما"')
  })

  it('Card renders as a link only when given an href', () => {
    expect(html(<Card title="حلب">x</Card>)).toMatch(/^<div class="card">/)
    expect(html(<Card title="حلب" href="/cities/aleppo">x</Card>)).toMatch(/^<a class="card" href="\/cities\/aleppo">/)
  })

  it('SoonTag is localised', () => {
    expect(html(<SoonTag locale="ar" />)).toContain('قريباً')
    expect(html(<SoonTag locale="en" />)).toContain('Soon')
  })
})

describe('<StayCard> (content rule ق5)', () => {
  const props = {
    locale: 'ar' as const,
    cityName: 'دمشق',
    href: 'https://ahleenbooking.com',
    rel: 'sponsored noopener',
    disclosure: 'أهلين شريك هذا الدليل.',
    aboutHref: '/about',
  }

  it('opens the partner in a new tab with the configured rel', () => {
    const out = html(<StayCard {...props} />)
    expect(out).toContain('href="https://ahleenbooking.com"')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="sponsored noopener"')
  })

  it('always carries the disclosure line and a link explaining the partnership', () => {
    const out = html(<StayCard {...props} />)
    expect(out).toContain('أهلين شريك هذا الدليل.')
    expect(out).toContain('href="/about"')
    expect(out).toContain('إقامات في دمشق')
  })

  it('works in English', () => {
    const out = html(<StayCard {...props} locale="en" cityName="Damascus" disclosure="Ahleen is this guide’s partner." />)
    expect(out).toContain('Stays in Damascus')
    expect(out).toContain('Book a stay with Ahleen')
  })
})
