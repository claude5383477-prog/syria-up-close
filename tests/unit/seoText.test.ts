import { describe as group, expect, it } from 'vitest'
import { FORBIDDEN_META } from '@/lib/seoAudit'
import { articleMeta, cityMeta, DESC_MAX, DESC_MIN, describe, fitTopic, len, listJoin, ruralMeta, SITE_LINE, TITLE_MAX, TITLE_SUFFIX, topicRoom } from '@/lib/seoText'

const full = (topic: string, locale: 'ar' | 'en') => topic + TITLE_SUFFIX[locale]

group('lengths', () => {
  it('counts characters, not UTF-16 units', () => {
    expect(len('دمشق')).toBe(4)
    expect(len('a😀b')).toBe(3)
  })
  it('leaves room for the site name', () => {
    expect(topicRoom('ar') + len(TITLE_SUFFIX.ar)).toBe(TITLE_MAX)
    expect(topicRoom('en') + len(TITLE_SUFFIX.en)).toBe(TITLE_MAX)
  })
})

group('listJoin', () => {
  it('joins Arabic with و and English with commas and "and"', () => {
    expect(listJoin(['طبيعة', 'آثار', 'أكل'], 'ar')).toBe('طبيعة وآثار وأكل')
    expect(listJoin(['a'], 'en')).toBe('a')
    expect(listJoin(['a', 'b'], 'en')).toBe('a and b')
    expect(listJoin(['a', 'b', 'c'], 'en')).toBe('a, b and c')
  })
})

group('fitTopic', () => {
  it('keeps every part that fits', () => {
    expect(fitTopic('دمشق', ['شو تشوف', 'شو تاكل'], 'ar')).toBe('دمشق: شو تشوف وشو تاكل')
  })
  it('drops optional parts from the end but keeps the tail', () => {
    const t = fitTopic('دير مار جرجس الحميراء', ['طبيعة', 'آثار', 'أكل', 'سيران'], 'ar', 'مشوار من حمص')
    expect(len(t)).toBeLessThanOrEqual(topicRoom('ar'))
    expect(t.endsWith('مشوار من حمص')).toBe(true)
    expect(t.startsWith('دير مار جرجس الحميراء: ')).toBe(true)
  })
  it('falls back to the head alone when nothing fits or nothing is given', () => {
    expect(fitTopic('x'.repeat(50), ['y'], 'en', 'z')).toBe('x'.repeat(50))
    expect(fitTopic('Aleppo', [], 'en')).toBe('Aleppo')
  })
})

group('describe', () => {
  it('adds whole sentences, ending each with a full stop, and skips empty ones', () => {
    expect(describe(['أول جملة', null, '', undefined, false, 'تانية.', '.'])).toBe('أول جملة. تانية.')
  })
  it('leaves out a sentence that would overflow once the text is long enough', () => {
    const a = 'أ'.repeat(130)
    expect(describe([a, 'ب'.repeat(40)])).toBe(`${a}.`)
  })
  it('cuts the overflowing sentence at a word when the text is still short', () => {
    const d = describe(['قصيرة', Array.from({ length: 60 }, () => 'كلمة').join(' ')])
    expect(len(d)).toBeLessThanOrEqual(DESC_MAX)
    expect(len(d)).toBeGreaterThanOrEqual(DESC_MIN)
    expect(d.endsWith('كلمة…')).toBe(true)
  })
  it('cuts a first sentence longer than the limit', () => {
    const d = describe(['word '.repeat(60)])
    expect(len(d)).toBeLessThanOrEqual(DESC_MAX)
    expect(d.endsWith('word…')).toBe(true)
  })
  it('cuts a single unbroken word too', () => {
    expect(len(describe(['x'.repeat(300)]))).toBeLessThanOrEqual(DESC_MAX)
  })
})

const city = { locale: 'ar' as const, name: 'دمشق', lede: 'حارات ضيقة وأبواب خشب وأسواق مسقوفة. أقدم مدينة مأهولة تُقرأ بالمشي البطيء.', sights: 12, eat: 8, dishes: 3, sweets: 4, stays: 6, rural: 4 }

group('cityMeta', () => {
  it('names only the sections the city page shows', () => {
    const m = cityMeta(city)
    expect(m.title).toBe('دمشق: شو تشوف وشو تاكل ووين تنام')
    expect(m.description.startsWith(city.lede)).toBe(true)
    expect(m.description).toContain('فنادقها')
  })
  it('no stays: neither the title nor the description promises where to stay', () => {
    const m = cityMeta({ ...city, stays: 0 })
    expect(m.title).not.toContain('تنام')
    expect(m.description).not.toMatch(/فنادق|تنام|إقامة/)
  })
  it('dishes without restaurants still count as "what to eat", described as dishes', () => {
    const m = cityMeta({ ...city, eat: 0, sights: 0, stays: 0, sweets: 0, rural: 0 })
    expect(m.title).toBe('دمشق: شو تاكل')
    expect(m.description).toContain('أكلاتها')
    expect(m.description).not.toContain('مطاعم')
  })
  it('a city with nothing yet: a plain guide title and no section list', () => {
    const m = cityMeta({ ...city, lede: null, sights: 0, eat: 0, dishes: 0, sweets: 0, stays: 0, rural: 0 })
    expect(m.title).toBe('دمشق: دليل المدينة')
    expect(m.description).toBe(SITE_LINE.ar[0])
  })
  it('English: travel-guide title within the limit, no Arabic-only countryside', () => {
    const m = cityMeta({ ...city, locale: 'en', name: 'Damascus', lede: 'Narrow lanes, wooden doors and covered markets.' })
    expect(m.title).toBe('Damascus travel guide: what to see and eat')
    expect(len(full(m.title, 'en'))).toBeLessThanOrEqual(TITLE_MAX)
    expect(m.description).not.toMatch(/countryside/i)
    const bare = cityMeta({ ...city, locale: 'en', name: 'Idlib', lede: null, sights: 0, eat: 0, dishes: 0, sweets: 0, stays: 0, rural: 0 })
    expect(bare.title).toBe('Idlib travel guide')
    const dishes = cityMeta({ ...city, locale: 'en', name: 'Hama', eat: 0 })
    expect(dishes.description).toContain('local dishes')
    expect(cityMeta({ ...city, locale: 'en', name: 'Hama', sights: 0 }).title).toBe('Hama travel guide: what to eat')
    expect(cityMeta({ ...city, locale: 'en', name: 'Hama', eat: 0, dishes: 0 }).title).toBe('Hama travel guide: what to see')
  })
})

const rural = { name: 'بلودان', fromName: 'دمشق', distance: 'نحو 50 كم من دمشق', description: 'مصيف جبلي فوق سهل الزبداني، بهواء بارد وبساتين وينابيع.', nature: 6, ruins: 3, food: 0, picnic: 0, stays: 3 }

group('ruralMeta', () => {
  it('title from the filled sections plus the trip from the city, within the limit', () => {
    const m = ruralMeta(rural)
    expect(m.title).toBe('بلودان: طبيعة وآثار ومشوار من دمشق')
    expect(len(full(m.title, 'ar'))).toBeLessThanOrEqual(TITLE_MAX)
  })
  it('no restaurants: nothing about eating in the title or description', () => {
    const m = ruralMeta(rural)
    expect(m.title).not.toMatch(/أكل|تاكل/)
    expect(m.description).not.toMatch(/تاكل|مطاعم/)
    expect(m.description).toContain('المسافة: نحو 50 كم من دمشق')
    expect(m.description).toContain('وين تنام')
    expect(len(m.description)).toBeGreaterThanOrEqual(DESC_MIN)
    expect(len(m.description)).toBeLessThanOrEqual(DESC_MAX)
  })
  it('lists every filled section, and stays only when there are some', () => {
    const m = ruralMeta({ ...rural, food: 2, picnic: 1, stays: 0, distance: null, fromName: null })
    expect(m.title).toBe('بلودان: طبيعة وآثار وأكل وسيران')
    expect(m.description).toContain('وين تاكل')
    expect(m.description).not.toContain('وين تنام')
  })
})

group('closing line alternatives', () => {
  it('uses the short closing line when the long one does not fit', () => {
    const d = describe(['أ'.repeat(120), SITE_LINE.ar])
    expect(d).toBe(`${'أ'.repeat(120)}. ${SITE_LINE.ar[1]}`)
  })
})

group('ruralMeta, long section list', () => {
  it('drops the map rather than cutting the list mid-word', () => {
    const m = ruralMeta({ ...rural, food: 2, picnic: 1 })
    expect(m.description).not.toMatch(/…$/)
    expect(m.description).toContain('وسيران وتخييم.')
    expect(len(m.description)).toBeLessThanOrEqual(DESC_MAX)
  })
})

group('articleMeta', () => {
  it('keeps the title and closes with the site line', () => {
    const m = articleMeta('en', 'Visa & entry', ['Visa types, who needs one.'])
    expect(m.title).toBe('Visa & entry')
    expect(m.description).toBe(`Visa types, who needs one. ${SITE_LINE.en[0]}`)
  })
})

group('no prices or safety claims', () => {
  it('none of the builders produce forbidden words', () => {
    const texts = [cityMeta(city), cityMeta({ ...city, locale: 'en', name: 'Damascus' }), ruralMeta(rural), ...[...SITE_LINE.ar, ...SITE_LINE.en].map((d) => ({ title: '', description: d }))]
    for (const t of texts) expect(`${t.title} ${t.description}`).not.toMatch(FORBIDDEN_META)
  })
})
