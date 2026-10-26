import { describe, expect, it } from 'vitest'
import { llmsTxt } from '@/lib/llms'

describe('llms.txt', () => {
  it('lists the cities, trips and first-visit pages as Markdown links', () => {
    const out = llmsTxt({
      base: 'https://upclosesyria.com',
      cities: [{ name: 'دمشق', en: 'Damascus', path: '/cities/damascus', note: 'حارات  ضيقة\nوأبواب' }, { name: 'حلب', en: 'حلب', path: '/cities/aleppo' }],
      trips: [{ name: 'بلودان', path: '/inside/bloudan' }],
      firstVisit: [],
    })
    expect(out.startsWith('# سوريا عن قرب | Syria Up Close\n')).toBe(true)
    expect(out).toContain('- [دمشق / Damascus](https://upclosesyria.com/cities/damascus): حارات ضيقة وأبواب')
    expect(out).toContain('- [حلب](https://upclosesyria.com/cities/aleppo)\n')
    expect(out).toContain('- [بلودان](https://upclosesyria.com/inside/bloudan)')
    expect(out).not.toContain('أول زيارة')
    expect(out).toContain('https://upclosesyria.com/sitemap.xml')
  })
})
