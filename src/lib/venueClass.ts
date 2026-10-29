// Restaurant classes on the city pages (owner brief, batch 4, 2026-10-29): two classes, each with its own
// sub-classes. Used by the Venues collection (select options and validation), the starter guide
// (content/guide) and the city page's food section. Sweet shops keep their own section; parks are not food.

export const VENUE_CATEGORIES = ['tourist', 'popular'] as const
export type VenueCategory = (typeof VENUE_CATEGORIES)[number]

type Label = { ar: string; en: string }

export const VENUE_SUBCATEGORIES = {
  tourist: {
    'arab-house': { ar: 'بيوت عربية', en: 'Old courtyard houses' },
    levantine: { ar: 'مطبخ شامي', en: 'Levantine kitchen' },
    rooftop: { ar: 'سطوح وإطلالات', en: 'Rooftops and views' },
    cafe: { ar: 'كافيهات', en: 'Cafes' },
  },
  popular: {
    shawarma: { ar: 'شاورما', en: 'Shawarma' },
    grills: { ar: 'مشاوي', en: 'Grills' },
    'home-cooking': { ar: 'طبخ عربي', en: 'Home cooking' },
    breakfast: { ar: 'فطور', en: 'Breakfast' },
    falafel: { ar: 'فلافل وسندويش', en: 'Falafel and sandwiches' },
    manakish: { ar: 'مناقيش وفطائر', en: 'Manakish and pies' },
  },
} as const satisfies Record<VenueCategory, Record<string, Label>>

export type VenueSubcategory = { [C in VenueCategory]: keyof (typeof VENUE_SUBCATEGORIES)[C] }[VenueCategory]

export const CATEGORY_LABELS: Record<VenueCategory, { name: Label; desc: Label }> = {
  tourist: {
    name: { ar: 'مطاعم سياحية', en: 'Tourist restaurants' },
    desc: { ar: 'بيوت عربية وأجواء وجلسة، للضيوف والمناسبات.', en: 'Courtyard houses, views and a long sit-down, for guests and occasions.' },
  },
  popular: {
    name: { ar: 'مطاعم مشهورة وشعبية', en: 'Popular local spots' },
    desc: { ar: 'اللي بياكل فيها أهل البلد: سريعة، مشهورة، وبتعرفها الناس من زمان.', en: 'Where locals eat: quick, well known, and around for years.' },
  },
}

export const isCategory = (v: unknown): v is VenueCategory => VENUE_CATEGORIES.includes(v as VenueCategory)

/** The sub-classes of one class, in display order. */
export function subcategoriesOf(category: VenueCategory): VenueSubcategory[] {
  return Object.keys(VENUE_SUBCATEGORIES[category]) as VenueSubcategory[]
}

/** Every sub-class with its class, for the admin select. */
export function allSubcategoryOptions(): { value: VenueSubcategory; label: Label; category: VenueCategory }[] {
  return VENUE_CATEGORIES.flatMap((category) =>
    subcategoriesOf(category).map((value) => ({ value, category, label: (VENUE_SUBCATEGORIES[category] as Record<string, Label>)[value]! })),
  )
}

export function subcategoryLabel(sub: VenueSubcategory): Label {
  return allSubcategoryOptions().find((o) => o.value === sub)!.label
}

/** A sub-class must belong to the chosen class; an empty sub-class is fine (the correspondent fills it later). */
export function checkSubcategory(category: unknown, sub: unknown): true | string {
  if (sub == null || sub === '') return true
  if (!isCategory(category)) return 'اختر صنف المطعم قبل القسم.'
  return subcategoriesOf(category).includes(sub as VenueSubcategory) ? true : 'هذا القسم لا يتبع الصنف المختار.'
}

type Classified = { category?: VenueCategory | null; subcategory?: VenueSubcategory | null }

/** How many places a class (and optionally one of its sub-classes) has. */
export function countIn(items: readonly Classified[], category: VenueCategory, sub?: VenueSubcategory): number {
  return items.filter((v) => v.category === category && (sub == null || v.subcategory === sub)).length
}

/** The sub-classes of a class that have no place yet: each gets a dashed "awaiting the correspondent" card. */
export function emptySubcategories(items: readonly Classified[], category: VenueCategory): VenueSubcategory[] {
  return subcategoriesOf(category).filter((s) => countIn(items, category, s) === 0)
}

/** The class shown first: the one with places, tourist on a tie. */
export function defaultCategory(items: readonly Classified[]): VenueCategory {
  return countIn(items, 'popular') > countIn(items, 'tourist') ? 'popular' : 'tourist'
}
