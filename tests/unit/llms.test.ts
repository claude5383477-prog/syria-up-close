import { describe, expect, it } from 'vitest'
import { llmsLinks, llmsTxt } from '@/lib/llms'

const base = 'https://www.upclosesyria.com'

describe('llms.txt', () => {
  it('lists the cities, trips, first-visit pages and season reports as Markdown links', () => {
    const out = llmsTxt({
      base,
      cities: [{ name: 'دمشق', en: 'Damascus', path: '/cities/damascus', englishPath: '/en/cities/damascus', note: 'حارات  ضيقة\nوأبواب' }, { name: 'حلب', en: 'حلب', path: '/cities/aleppo' }],
      trips: [{ name: 'بلودان', path: '/inside/bloudan' }],
      firstVisit: [],
      seasons: [{ name: 'أول ثلج', path: '/seasons/x', note: 'تقرير ميداني' }],
    })
    expect(out.startsWith('# سوريا عن قرب | Syria Up Close\n')).toBe(true)
    expect(out).toContain(`- [دمشق / Damascus](${base}/cities/damascus) ([English](${base}/en/cities/damascus)): حارات ضيقة وأبواب`)
    expect(out).toContain(`- [حلب](${base}/cities/aleppo)\n`)
    expect(out).toContain(`- [بلودان](${base}/inside/bloudan)`)
    expect(out).toContain(`## تقارير الموسم`)
    expect(out).not.toContain('أول زيارة')
    expect(out).toContain(`${base}/about#how-we-check`)
    expect(out).toContain(`${base}/sitemap.xml`)
  })

  it('leaves out the season section when there are no reports', () => {
    expect(llmsTxt({ base, cities: [], trips: [], firstVisit: [] })).not.toContain('تقارير الموسم')
  })
})

describe('llmsLinks', () => {
  const info = (p: string) => ({ '/cities/damascus': { name: 'دمشق', en: 'Damascus', note: 'مدينة' }, '/outside/first-visit/visa': { name: 'التأشيرة', en: 'Visa', note: null }, '/inside/bloudan': { name: 'بلودان' } })[p]

  it('takes only sitemap pages it can name, with the English URL only when that version is indexable', () => {
    expect(
      llmsLinks(
        [
          { path: '/cities/damascus', translated: true },
          { path: '/outside/first-visit/visa', translated: false },
          { path: '/inside/bloudan' },
          { path: '/cities/unknown' },
        ],
        info,
      ),
    ).toEqual([
      { name: 'دمشق', en: 'Damascus', note: 'مدينة', path: '/cities/damascus', englishPath: '/en/cities/damascus' },
      { name: 'التأشيرة', en: 'Visa', path: '/outside/first-visit/visa' },
      // The countryside is an Arabic-only section: no English URL even when "translated".
      { name: 'بلودان', path: '/inside/bloudan' },
    ])
  })
})
