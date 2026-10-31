import { describe, expect, it } from 'vitest'
import { decodeEntities, FORBIDDEN_META, internalPath, parsePage } from '@/lib/seoAudit'

const O = ['https://www.upclosesyria.com', 'http://localhost:3000']

describe('internalPath', () => {
  it('keeps site pages, relative or absolute, without the trailing slash', () => {
    expect(internalPath('/cities/damascus/', O)).toBe('/cities/damascus')
    expect(internalPath('https://www.upclosesyria.com/en', O)).toBe('/en')
    expect(internalPath('http://localhost:3000/', O)).toBe('/')
    expect(internalPath('/inside/%D8%A8', O)).toBe('/inside/ب')
  })
  it('ignores other sites, anchors, mail, files, the CMS and bad URLs', () => {
    for (const h of ['', '#map', 'mailto:a@b.c', 'tel:1', 'javascript:void(0)', 'https://ahleenbooking.com/x', '/og.png', '/api/media/file/a', '/admin', '/_next/static/x', 'http://[bad']) expect(internalPath(h, O), h).toBeNull()
  })
})

describe('decodeEntities', () => {
  it('decodes the entities React writes, once', () => {
    expect(decodeEntities('a &amp; b &lt;c&gt; &quot;d&quot; &#x27;e&#39; &#1583; &amp;lt;')).toBe(`a & b <c> "d" 'e' د &lt;`)
  })
})

const html = `<!doctype html><html><head><title>دمشق: شو تشوف | سوريا عن قرب</title>
<meta name="description" content="وصف &amp; تجربة"/><meta name="robots" content="noindex, follow"/>
<link rel="canonical" href="https://www.upclosesyria.com/cities/damascus"/>
<link rel="alternate" hreflang="ar" href="https://www.upclosesyria.com/cities/damascus"/>
<link rel="alternate" hreflang="en" href="https://www.upclosesyria.com/en/cities/damascus"/>
<style>h1{}</style></head><body><header><a href="/">الرئيسية</a><a href="/cities">المدن</a></header>
<main><h1>دمشق</h1><h3>قفزة</h3><h2 class="x">قسم <b>غامق</b></h2><img src="a.webp" alt="صورة"/><img src="b.webp">
<a href="/inside/bloudan">بلودان</a><a href="/inside/bloudan">مرة تانية</a><a href="https://ahleenbooking.com">أهلين</a></main>
<script>document.write('<h1>no</h1>')</script><footer><a href="/about">من نحن</a></footer></body></html>`

describe('parsePage', () => {
  it('reads the head', () => {
    const p = parsePage(html, O)
    expect(p.title).toBe('دمشق: شو تشوف | سوريا عن قرب')
    expect(p.description).toBe('وصف & تجربة')
    expect(p.robots).toBe('noindex, follow')
    expect(p.canonical).toBe('https://www.upclosesyria.com/cities/damascus')
    expect(p.hreflang).toEqual(['ar=/cities/damascus', 'en=/en/cities/damascus'])
  })
  it('reads headings (scripts ignored), skipped levels, images without alt and links', () => {
    const p = parsePage(html, O)
    expect(p.h1).toEqual(['دمشق'])
    expect(p.headingSkips).toEqual(['H1→H3 (قفزة)'])
    expect(p.imgsNoAlt).toBe(1)
    expect(p.links).toEqual(['/', '/cities', '/inside/bloudan', '/about'])
    expect(p.mainLinks).toEqual(['/inside/bloudan'])
  })
  it('flags a page that does not start at H1, and copes with an empty document', () => {
    expect(parsePage('<html><head></head><body><h2>a</h2></body></html>', O).headingSkips).toEqual(['starts at H2'])
    const empty = parsePage('', O)
    expect(empty).toMatchObject({ title: '', description: '', canonical: '', h1: [], links: [], mainLinks: [] })
  })
})

describe('FORBIDDEN_META', () => {
  it('matches price and safety words in both languages, not innocent ones', () => {
    for (const w of ['Prices in Damascus', 'is it safe', 'رسوم بلا سعر', 'أسعار', 'مكان آمن', 'الأمان', 'secure travel']) expect(w).toMatch(FORBIDDEN_META)
    for (const w of ['Damascus travel guide', 'شو تشوف وشو تاكل', 'safely'.slice(0, 4) + 'ron']) expect(w).not.toMatch(FORBIDDEN_META)
  })
})
