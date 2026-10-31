import { describe, expect, it } from 'vitest'
import { blocked, CRAWLERS, faqFacts, flightPayload, geoFacts, htmlText, jsOnlyText, jsonLd, payloadText, timeFacts } from '@/lib/geoAudit'

const flight = (s: string) => `<script>self.__next_f.push([1,${JSON.stringify(s)}])</script>`

describe('crawlers', () => {
  it('lists the six crawlers robots.txt lets in, each with its product token in the user agent', () => {
    expect(CRAWLERS.map((c) => c.name)).toEqual(['Googlebot', 'Bingbot', 'OAI-SearchBot', 'GPTBot', 'ChatGPT-User', 'PerplexityBot'])
    for (const c of CRAWLERS) expect(c.ua.toLowerCase()).toContain(c.name.toLowerCase())
  })
})

describe('blocked', () => {
  it('spots refusals and firewall challenge pages, and passes our own HTML', () => {
    expect(blocked(403, '')).toBe('HTTP 403')
    expect(blocked(429, '')).toBe('HTTP 429')
    expect(blocked(200, '<html><title>Vercel Security Checkpoint</title></html>')).toBe('Vercel challenge')
    expect(blocked(200, '<html><title>Just a moment...</title></html>')).toBe('Cloudflare challenge')
    expect(blocked(200, '{"ok":true}')).toBe('not HTML')
    expect(blocked(200, '<!DOCTYPE html><html lang="ar"><body>دمشق</body></html>')).toBeNull()
    expect(blocked(404, '<html></html>')).toBeNull()
  })
})

describe('text before and after JavaScript', () => {
  const html = `<html><head><style>.a{}</style></head><body><h1>دمشق &amp; حلب</h1><div hidden><p>مطعم مخفي</p></div><img alt="باب توما">${flight('["$","b",null,{"children":"مطعم مخفي"}]["$","b",null,{"children":"باب توما"}]["$","b",null,{"children":"سرّ الحميدية"}]["$","i",null,{"text":"مثل شامي","meaning":"معنى المثل"}]["$","a",null,{"children":"$L1","className":"x-y"}]["$","c",null,{"name":"فهرس البحث","title":"عنوان"}]')}${flight('bad \\')}</body></html>`

  it('reads the HTML text, hidden or not, without scripts and styles', () => {
    expect(htmlText(html)).toBe('دمشق & حلب مطعم مخفي')
  })

  it('decodes the hydration payload, skipping broken chunks', () => {
    expect(flightPayload(html)).toContain('سرّ الحميدية')
  })

  it('collects words from children, text and meaning only, not names, titles, references or classes', () => {
    expect(payloadText(html)).toEqual(['مطعم مخفي', 'باب توما', 'سرّ الحميدية', 'مثل شامي', 'معنى المثل'])
  })

  it('reports words only JavaScript will show; text in attributes and ignored words do not count', () => {
    expect(jsOnlyText(html)).toEqual(['سرّ الحميدية', 'مثل شامي', 'معنى المثل'])
    expect(jsOnlyText(html, new Set(['مثل شامي', 'معنى المثل']))).toEqual(['سرّ الحميدية'])
  })
})

describe('timeFacts', () => {
  it('counts <time> tags, flags bad datetimes, and finds plain-text dates, labelled ones apart', () => {
    const t = timeFacts(
      '<p>آخر تحديث: <time datetime="2026-10-31">31 تشرين الأول 2026</time> · <time datetime="2026-10-31T08:00:00.000Z">x</time> · <time>y</time> · <time datetime="أمس">z</time></p>' +
        '<p>قائمة جُمعت في ٢٤ تشرين الأول ٢٠٢٦ من أدلة. أعلنت الوزارة في آب 2026. Last updated: 3 March 2026</p><script>"آذار 2026"</script>',
    )
    expect(t.tags).toBe(4)
    expect(t.invalid).toEqual(['(none)', 'أمس'])
    expect(t.untagged).toEqual(['٢٤ تشرين الأول ٢٠٢٦', 'آب 2026', '3 March 2026'])
    expect(t.labelled).toEqual(['جُمعت في ٢٤ تشرين الأول ٢٠٢٦', 'Last updated: 3 March 2026'])
  })
})

describe('JSON-LD and FAQ', () => {
  const ld = (d: unknown) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`
  const faq = ld({ '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'وين نروح؟' }, { '@type': 'Question', name: 'شو ناكل؟' }] })

  it('flattens @graph and marks broken blocks', () => {
    const html = ld({ '@graph': [{ '@type': 'WebPage' }, { '@type': 'TouristDestination' }] }) + ld([{ '@type': 'BreadcrumbList' }]) + '<script type="application/ld+json">{bad</script>'
    expect(jsonLd(html).map((n) => n['@type'])).toEqual(['WebPage', 'TouristDestination', 'BreadcrumbList', 'INVALID'])
  })

  it('matches the questions shown in <details class="faq"> with those in FAQPage', () => {
    const shown = '<details class="faq"><summary>وين نروح؟</summary><p>a</p></details><details class="faq open"><summary> شو <b>بنشرب</b>؟</summary></details>'
    expect(faqFacts(shown + faq)).toEqual({ shown: ['وين نروح؟', 'شو بنشرب ؟'], inSchema: ['وين نروح؟', 'شو ناكل؟'], onlyShown: ['شو بنشرب ؟'], onlySchema: ['شو ناكل؟'] })
    expect(faqFacts('<p>no faq</p>')).toEqual({ shown: [], inSchema: [], onlyShown: [], onlySchema: [] })
  })
})

describe('geoFacts', () => {
  it('summarises a page: H1, the in-short box and its place, sources and schema types', () => {
    const page = '<html><body><h1>بلودان</h1><span class="eyebrow">باختصار</span><section id="map"></section><p>المصادر: ويكيبيديا</p></body></html>'
    const f = geoFacts(page)
    expect(f).toMatchObject({ h1: 'بلودان', short: true, shortEarly: true, sources: true, ldTypes: [], jsOnly: [] })
    expect(f.words).toBeGreaterThan(2)
    expect(geoFacts('<html><body><h1>x</h1><section id="map"></section><span class="eyebrow">باختصار</span></body></html>').shortEarly).toBe(false)
    expect(geoFacts('<html><body><h2>x</h2></body></html>')).toMatchObject({ h1: '', short: false, shortEarly: false, sources: false })
  })
})
