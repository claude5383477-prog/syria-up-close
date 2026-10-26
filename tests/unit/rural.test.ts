import { describe, expect, it } from 'vitest'
import { ahleenCityUrl, cityAnswers, foldArabic, mainCities, parseTripKey, searchItems, sourceLines, tripAnswers, tripPath, withUtm } from '@/lib/rural'

describe('trip paths', () => {
  it('uses the slug, or the id when there is none', () => {
    expect(tripPath({ id: 3, slug: 'bloudan' })).toBe('/inside/bloudan')
    expect(tripPath({ id: 7, slug: null })).toBe('/inside/trip-7')
    expect(tripPath({ id: 8 })).toBe('/inside/trip-8')
  })
  it('parses the key back', () => {
    expect(parseTripKey('bloudan')).toEqual({ slug: 'bloudan' })
    expect(parseTripKey('trip-12')).toEqual({ id: 12 })
    expect(parseTripKey('بلودان')).toBeNull()
    expect(parseTripKey('../x')).toBeNull()
  })
})

describe('main cities', () => {
  it('drops cities that belong to another city', () => {
    const list = [{ slug: 'damascus' }, { slug: 'bloudan', parentCity: 1 }, { slug: 'homs', parentCity: null }]
    expect(mainCities(list).map((c) => c.slug)).toEqual(['damascus', 'homs'])
  })
})

describe('Ahleen links', () => {
  it('points "all stays" at the city page on Ahleen, with its own slugs where they differ', () => {
    expect(ahleenCityUrl('https://www.ahleenbooking.com/', 'damascus')).toBe('https://www.ahleenbooking.com/cities/damascus')
    expect(ahleenCityUrl('', 'quneitra')).toBe('https://www.ahleenbooking.com/cities/al-qunaytirah')
  })
  it('adds UTM tags to Ahleen links only', () => {
    const u = new URL(withUtm('https://www.ahleenbooking.com/hotels/aram-hotel', 'city-damascus'))
    expect(u.searchParams.get('utm_source')).toBe('upclosesyria')
    expect(u.searchParams.get('utm_medium')).toBe('referral')
    expect(u.searchParams.get('utm_campaign')).toBe('city-damascus')
    expect(withUtm('https://ahleenbooking.com/?a=1', 'x')).toContain('a=1&utm_source=upclosesyria')
    expect(withUtm('https://example.com/x', 'x')).toBe('https://example.com/x')
    expect(withUtm('not a url', 'x')).toBe('not a url')
  })
})

describe('search', () => {
  const items = [
    { name: 'بلودان', sub: 'ريف دمشق', type: 'ريف', href: '/inside/bloudan' },
    { name: 'دمشق', sub: 'المدينة القديمة', type: 'مدينة', href: '/cities/damascus' },
    { name: 'الجامع الأموي', sub: 'دمشق', type: 'معلم', href: '/cities/damascus#sights' },
    { name: 'حلاوة الجبن الحمصية', sub: 'حمص', type: 'حلو', href: '/cities/homs#sweets' },
  ]
  it('folds Arabic spelling variants', () => {
    expect(foldArabic('الأموي')).toBe('اموي')
    expect(foldArabic('حلاوةُ')).toBe('حلاوه')
    expect(foldArabic('مشفى  الكبرى')).toBe('مشفي كبري')
  })
  it('finds by name first, then by subtitle', () => {
    expect(searchItems(items, 'دمشق').map((i) => i.name)).toEqual(['دمشق', 'بلودان', 'الجامع الأموي'])
    expect(searchItems(items, 'الاموي')[0]?.name).toBe('الجامع الأموي')
    expect(searchItems(items, 'حلاوه')[0]?.name).toBe('حلاوة الجبن الحمصية')
    expect(searchItems(items, 'د')).toEqual([])
    expect(searchItems(items, 'باريس')).toEqual([])
    expect(searchItems(items, 'دمشق', 1)).toHaveLength(1)
  })
})

describe('sources and answers', () => {
  it('splits sources by line', () => {
    expect(sourceLines('a\n\n b \n')).toEqual(['a', 'b'])
    expect(sourceLines(null)).toEqual([])
  })
  it('builds facts and questions only from what the page has', () => {
    const full = cityAnswers({ name: 'حمص', tag: 'قلب سوريا', eat: 'كبة', sweets: ['حلاوة الجبن'], sights: ['أ', 'ب', 'ج', 'د'], hotels: 3, rural: ['تدمر'] })
    expect(full.facts.map((f) => f.k)).toEqual(['المنطقة', 'شو تاكل', 'حلوها', 'أبرز المعالم', 'وين تنام', 'ريفها'])
    expect(full.facts[3]?.v).toBe('أ، ب، ج')
    expect(full.faq).toHaveLength(6)
    const empty = cityAnswers({ name: 'إدلب', sweets: [], sights: [], hotels: 0, rural: [] })
    expect(empty.facts.every((f) => f.k !== 'المنطقة')).toBe(true)
    expect(empty.facts.find((f) => f.k === 'حلوها')?.v).toBe('بانتظار مراسل المدينة')
    expect(empty.faq.map((f) => f.q)).toEqual(['وين بنام بـإدلب؟', 'كيف حال الكهرباء والإنترنت اليوم بـإدلب؟'])
  })
})

describe('trip answers', () => {
  it('uses the page’s own spots and says what is still waiting', () => {
    const spots = [
      { kind: 'stay' as const, name: 'فندق بلودان الكبير' },
      { kind: 'nature' as const, name: 'نبع أبو زاد' },
      { kind: 'ruins' as const, name: 'جبل يونان' },
    ]
    const a = tripAnswers({ name: 'بلودان', region: 'ريف دمشق', distance: 'نحو 50 كم من دمشق', spots, hotels: 2 })
    expect(a.facts.map((f) => f.v)).toEqual(['ريف دمشق، نحو 50 كم من دمشق', 'نبع أبو زاد', 'جبل يونان', 'فندق بلودان الكبير، 2 إقامة على أهلين', 'بانتظار المراسل'])
    expect(a.faq.map((f) => f.q)).toEqual(['كم بعيدة بلودان؟', 'شو في طبيعة وينابيع بـبلودان؟', 'في آثار بـبلودان؟', 'وين بنام بـبلودان؟', 'في أماكن تخييم بـبلودان؟'])
    const empty = tripAnswers({ name: 'ماري', region: 'ريف دير الزور', spots: [], hotels: 0 })
    expect(empty.facts[0]?.v).toBe('ريف دير الزور')
    expect(empty.faq).toHaveLength(2)
    expect(empty.faq[0]?.a).toContain('بانتظار المراسل')
  })
})
