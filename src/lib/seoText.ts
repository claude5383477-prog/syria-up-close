import type { Locale } from '@/lib/i18n'

// Page titles and meta descriptions (SEO day 4). One place builds them for every page type, from the
// page's own data: a title or description never names a section the page does not show ("no empty
// promises"), never mentions prices or safety, and the same text feeds Open Graph and Twitter.

/** The layout template adds this to every title except the home page's. */
export const TITLE_SUFFIX = { ar: ' | سوريا عن قرب', en: ' | Syria Up Close' } as const
export const TITLE_MAX = 60
export const DESC_MIN = 120
export const DESC_MAX = 160

/** Length as people and search engines count it: characters, not UTF-16 units. */
export const len = (s: string) => [...s].length

/** Room for the topic in a title once the site name is added. */
export const topicRoom = (locale: Locale) => TITLE_MAX - len(TITLE_SUFFIX[locale])

/** "a وb وc" in Arabic, "a, b and c" in English. */
export function listJoin(items: readonly string[], locale: Locale): string {
  if (locale === 'ar') return items.join(' و')
  if (items.length < 3) return items.join(' and ')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * "Head: a, b and tail", dropping optional parts from the end until it fits the title's room. The tail
 * (e.g. "a trip from Damascus") is kept as long as anything is; with nothing that fits, the head alone.
 */
export function fitTopic(head: string, optional: readonly string[], locale: Locale, tail?: string): string {
  const room = topicRoom(locale)
  for (let n = optional.length; n >= 0; n--) {
    const parts = [...optional.slice(0, n), ...(tail ? [tail] : [])]
    if (!parts.length) break
    const topic = `${head}: ${listJoin(parts, locale)}`
    if (len(topic) <= room) return topic
  }
  return head
}

const end = (s: string) => (/[.!؟?…]$/.test(s) ? s : `${s}.`)

type Sentence = string | null | undefined | false | readonly string[]

/**
 * A meta description from sentences in order of importance: each is added whole while the total stays
 * within DESC_MAX. A sentence may be a list of alternatives (longest first): the first that fits is used.
 * A sentence that would overflow is cut at a word boundary only when the text is still shorter than
 * DESC_MIN; otherwise it is left out. Empty items are skipped, so callers pass only facts the page shows.
 */
export function describe(sentences: readonly Sentence[]): string {
  let out = ''
  for (const item of sentences) {
    const options = (typeof item === 'string' ? [item] : item || []).map((raw) => end(raw.replace(/\s+/g, ' ').trim())).filter((x) => x !== '.')
    if (!options.length) continue
    const join = (x: string) => (out ? `${out} ${x}` : x)
    const fits = options.find((x) => len(join(x)) <= DESC_MAX)
    if (fits) {
      out = join(fits)
      continue
    }
    if (len(out) >= DESC_MIN) continue
    const s = options[options.length - 1]!
    const room = DESC_MAX - 1 - (out ? len(out) + 1 : 0)
    const cut = [...s].slice(0, room).join('')
    const atWord = cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length).replace(/[،,؛;:.\s]+$/, '')
    return join(`${atWord}…`)
  }
  return out
}

/** Closing line every description may use: true of every page on the site. */
export const SITE_LINE = {
  ar: ['دليل مستقل عن سوريا كما هي اليوم، بمعلومات مؤرخة.', 'دليل مستقل بمعلومات مؤرخة.'],
  en: ['An independent guide to Syria as it is today, with dated information.', 'An independent guide, dated.'],
} as const

export type Meta = { title: string; description: string }

export type CityFacts = {
  locale: Locale
  name: string
  lede?: string | null
  sights: number
  /** Restaurants and cafes (not the dish list). */
  eat: number
  dishes: number
  sweets: number
  stays: number
  /** Countryside trips shown on the page (Arabic page only). */
  rural: number
}

export function cityMeta(f: CityFacts): Meta {
  const ar = f.locale === 'ar'
  const shown = [f.sights && 'شو تشوف', (f.eat || f.dishes) && 'شو تاكل', f.stays && 'وين تنام'].filter((p): p is string => Boolean(p))
  const see = Boolean(f.sights)
  const eat = Boolean(f.eat || f.dishes)
  const enTopic = see && eat ? 'what to see and eat' : see ? 'what to see' : eat ? 'what to eat' : null
  const title = ar ? fitTopic(f.name, shown, 'ar') : fitTopic(`${f.name} travel guide`, enTopic ? [enTopic] : [], 'en')
  const inside = ar
    ? [f.sights && 'معالمها', f.eat && 'مطاعمها وكافيهاتها', !f.eat && f.dishes && 'أكلاتها', f.sweets && 'حلوياتها', f.stays && 'فنادقها', f.rural && 'مشاوير ريفها']
    : [f.sights && 'its sights', f.eat && 'restaurants and cafes', !f.eat && f.dishes && 'local dishes', f.sweets && 'sweets', f.stays && 'hotels']
  const list = inside.filter((p): p is string => Boolean(p))
  const contents = list.length ? (ar ? `في الدليل: ${list.join('، و')}` : `Inside: ${listJoin(list, 'en')}`) : null
  return { title: title === f.name && ar ? `${f.name}: دليل المدينة` : title, description: describe([f.lede, contents, SITE_LINE[f.locale]]) }
}

export type RuralFacts = {
  name: string
  fromName?: string | null
  distance?: string | null
  description?: string | null
  nature: number
  ruins: number
  food: number
  picnic: number
  stays: number
}

/** A countryside page (Arabic only, for people inside Syria). */
export function ruralMeta(f: RuralFacts): Meta {
  const parts = [f.nature && 'طبيعة', f.ruins && 'آثار', f.food && 'أكل', f.picnic && 'سيران'].filter((p): p is string => Boolean(p))
  const tail = f.fromName ? `مشوار من ${f.fromName}` : undefined
  const sections = [f.stays && 'وين تنام', f.food && 'وين تاكل', f.nature && 'ينابيع وطبيعة', f.ruins && 'آثار', f.picnic && 'سيران وتخييم'].filter((p): p is string => Boolean(p))
  return {
    title: fitTopic(f.name, parts, 'ar', tail),
    description: describe([
      f.description,
      f.distance && `المسافة: ${f.distance}`,
      // With the map when it fits; the sections alone otherwise (never a sentence cut mid-list).
      [`بالصفحة: ${[...sections, 'خريطة حيّة'].join('، و')}`, ...(sections.length ? [`بالصفحة: ${sections.join('، و')}`] : [])],
      SITE_LINE.ar,
    ]),
  }
}

/** A page whose title is its own text (a report, a story, a first-visit topic, a guide). */
export function articleMeta(locale: Locale, title: string, sentences: readonly Sentence[]): Meta {
  return { title, description: describe([...sentences, SITE_LINE[locale]]) }
}
