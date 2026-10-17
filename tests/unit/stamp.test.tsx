import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Stamp } from '@/components/Stamp'

const now = new Date('2026-10-17T12:00:00Z')
const verified = new Date('2026-10-15T09:00:00Z')
const old = new Date('2026-10-01T09:00:00Z')

const render = (props: Parameters<typeof Stamp>[0]) => renderToStaticMarkup(<Stamp {...props} />)

describe('<Stamp>', () => {
  it('pending: neutral style and the "awaiting first check" text', () => {
    const ar = render({ verifiedAt: null, maxAgeDays: 7, locale: 'ar', now })
    expect(ar).toContain('class="stamp pending"')
    expect(ar).toContain('بانتظار أول تحقق')
    expect(ar).not.toContain('<time')
    expect(render({ verifiedAt: null, maxAgeDays: 7, locale: 'en', now })).toContain('Awaiting first check')
  })

  it('fresh: last-updated date in a <time> element', () => {
    const en = render({ verifiedAt: verified, maxAgeDays: 7, locale: 'en', now })
    expect(en).toContain('class="stamp"')
    expect(en).toContain('Last updated: ')
    expect(en).toContain('<time dateTime="2026-10-15T09:00:00.000Z">15 October 2026</time>')
    expect(en).not.toContain('out of date')
  })

  it('fresh in Arabic uses the Syrian month names', () => {
    const ar = render({ verifiedAt: verified, maxAgeDays: 7, locale: 'ar', now })
    expect(ar).toContain('آخر تحديث: ')
    expect(ar).toContain('تشرين الأول')
  })

  it('stale: amber style, the date, and the "may be out of date" suffix', () => {
    const ar = render({ verifiedAt: old, maxAgeDays: 7, locale: 'ar', now })
    expect(ar).toContain('class="stamp stale"')
    expect(ar).toContain('آخر تحديث: ')
    expect(ar).toContain(' · قد تكون قديمة')
    const en = render({ verifiedAt: old, maxAgeDays: 7, locale: 'en', now })
    expect(en).toContain('1 October 2026</time> · May be out of date')
  })

  it('formats the date in Damascus time, not the server’s timezone', () => {
    // 22:30 UTC on the 16th is already the 17th in Damascus (UTC+3).
    const en = render({ verifiedAt: new Date('2026-10-16T22:30:00Z'), maxAgeDays: 7, locale: 'en', now })
    expect(en).toContain('17 October 2026')
  })
})
