// The five first-visit topics, in display order, with the prototype's titles and summaries (FIRSTVISIT).
// Used by the seed (initial drafts) and by /outside for topics that are not published yet.

export type FirstVisitTopic = 'visa' | 'arrival' | 'money' | 'connectivity' | 'transport'
type L = { ar: string; en: string }

export const FIRST_VISIT: { topic: FirstVisitTopic; title: L; summary: L }[] = [
  { topic: 'visa', title: { ar: 'التأشيرة والدخول', en: 'Visa & entry' }, summary: { ar: 'أنواع التأشيرة ومن يحتاجها، والوثائق المطلوبة.', en: 'Visa types, who needs one, required documents.' } },
  { topic: 'arrival', title: { ar: 'الوصول', en: 'Getting there' }, summary: { ar: 'المطارات والمعابر البرية، ومن بيروت وعمّان.', en: 'Airports and land crossings, from Beirut and Amman.' } },
  { topic: 'money', title: { ar: 'المال', en: 'Money' }, summary: { ar: 'العملة والصرافة والدفع والبطاقات.', en: 'Currency, exchange, cash and cards.' } },
  { topic: 'connectivity', title: { ar: 'الاتصالات', en: 'Staying connected' }, summary: { ar: 'شرائح الهاتف والإنترنت والتطبيقات.', en: 'SIM cards, data and apps.' } },
  { topic: 'transport', title: { ar: 'التنقل', en: 'Getting around' }, summary: { ar: 'بين المدن وداخلها: باصات، تكاسي، سيارات.', en: 'Between and within cities: buses, taxis, cars.' } },
]
