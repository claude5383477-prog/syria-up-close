// Seed content copied verbatim from docs/source/syria-up-close.html (CITIES and DAYTRIPS).
// Only editorial text lives here. No status, reports, photos or daily details (content rule ق2).

import { FIRST_VISIT } from '@/lib/firstVisitTopics'

export { FIRST_VISIT }

type L = { ar: string; en: string }
type SeedPlace = { title: L; description: L }
export type SeedCity = { slug: string; name: L; tag: L; lede: L; coverShotNote: L; eat: L; places: SeedPlace[] }

const p = (ar: [string, string], en: [string, string]): SeedPlace => ({
  title: { ar: ar[0], en: en[0] },
  description: { ar: ar[1], en: en[1] },
})

export const CITIES: SeedCity[] = [
  {
    slug: 'damascus',
    name: { ar: 'دمشق', en: 'Damascus' },
    tag: { ar: 'المدينة القديمة', en: 'Old city' },
    lede: {
      ar: 'حارات ضيقة وأبواب خشب وأسواق مسقوفة. أقدم مدينة مأهولة تُقرأ بالمشي البطيء.',
      en: 'Narrow lanes, wooden doors and covered souqs. A city best read on foot, slowly.',
    },
    coverShotNote: { ar: 'ضوء على بلاط باب توما بعد المطر', en: 'Light on Bab Touma paving after rain' },
    places: [
      p(['الجامع الأموي', 'صحن الجامع وقت العصر، حين يهدأ الزحام.'], ['Umayyad Mosque', 'The courtyard in late afternoon, when it quietens.']),
      p(['سوق الحميدية', 'ضوء يتسلل من ثقوب السقف المعدني على البسطات.'], ['Souq al-Hamidiyah', 'Light falling through the holes in the iron roof.']),
      p(['البزورية', 'روائح البهارات والصابون والحلو العربي.'], ['Al-Buzuriyah', 'Spices, soap and sweets, all in one lane.']),
      p(['القيمرية وباب توما', 'حارات الأبواب الخشبية والبيوت الدمشقية.'], ['Qaymariyya & Bab Touma', 'Lanes of wooden doors and Damascene houses.']),
      p(['قصر العظم', 'بيت دمشقي كبير بأرض ديار ونافورة.'], ['Azem Palace', 'A grand Damascene house around a courtyard.']),
      p(['التكية السليمانية', 'قباب ومآذن عثمانية على ضفة بردى.'], ['Takiyya Sulaymaniyya', 'Ottoman domes beside the Barada.']),
    ],
    eat: {
      ar: 'فتة حمص بالسمن، كبة، شاكرية، فول الصبح، وحلو البزورية.',
      en: 'Chickpea fatteh, kibbeh, shakriyeh, morning foul, and sweets from al-Buzuriyah.',
    },
  },
  {
    slug: 'aleppo',
    name: { ar: 'حلب', en: 'Aleppo' },
    tag: { ar: 'القلعة والأسواق', en: 'Citadel & souqs' },
    lede: {
      ar: 'مدينة المطبخ والخانات. أجزاء من المدينة القديمة ما زالت تحت الترميم، ونذكر حال كل موقع بتاريخه.',
      en: 'A city of kitchens and caravanserais. Parts of the old city are still under restoration; we date the state of each site.',
    },
    coverShotNote: { ar: 'حجر القلعة الأصفر عند الغروب', en: 'Citadel stone at sunset' },
    places: [
      p(['قلعة حلب', 'المدخل والجسر الحجري فوق الخندق.'], ['Aleppo Citadel', 'The gate and stone bridge over the moat.']),
      p(['أسواق المدينة', 'أسواق مسقوفة متصلة، بعضها رُمّم وبعضها قيد الترميم.'], ['Old souqs', 'Linked covered markets, some restored, some in progress.']),
      p(['الجامع الأموي الكبير', 'أحد أهم معالم المدينة القديمة.'], ['Great Mosque of Aleppo', 'A landmark of the old city.']),
      p(['خان الوزير', 'واجهة حجرية من زمن القوافل.'], ['Khan al-Wazir', 'A caravan-era stone facade.']),
    ],
    eat: {
      ar: 'كباب بالكرز، كبة سفرجلية، محمرة، وكل شي فيه فستق حلبي.',
      en: 'Cherry kebab, quince kibbeh, muhammara, and anything with Aleppo pistachio.',
    },
  },
  {
    slug: 'latakia',
    name: { ar: 'اللاذقية', en: 'Latakia' },
    tag: { ar: 'الساحل', en: 'The coast' },
    lede: {
      ar: 'بحر وكورنيش وجبال قريبة. نقطة انطلاق لقرى الساحل والجبل.',
      en: 'Sea, corniche and nearby mountains. A base for coastal and mountain villages.',
    },
    coverShotNote: { ar: 'شباك صياد على الرصيف الصبح', en: "A fisherman's net on the quay, early morning" },
    places: [
      p(['الكورنيش', 'مشي المسا على البحر.'], ['The corniche', 'An evening walk by the sea.']),
      p(['أوغاريت (رأس شمرا)', 'موقع أثري قريب من المدينة.'], ['Ugarit (Ras Shamra)', 'An archaeological site near the city.']),
      p(['قلعة صلاح الدين', 'قلعة على حافة وادٍ في جبال الحفة.'], ['Saladin Castle', 'A castle on a ravine in the Haffeh hills.']),
    ],
    eat: { ar: 'سمك مشوي، صيادية، وخضرة الساحل الطازجة.', en: 'Grilled fish, sayadieh, and fresh coastal greens.' },
  },
  {
    slug: 'bloudan',
    name: { ar: 'بلودان', en: 'Bloudan' },
    tag: { ar: 'مصيف', en: 'Mountain resort' },
    lede: {
      ar: 'مصيف جبلي قريب من دمشق، هوا بارد بالصيف وثلج بالشتا. بجوار الزبداني وبساتينها.',
      en: "A mountain resort near Damascus: cool summers, snowy winters, next to Zabadani's orchards.",
    },
    coverShotNote: { ar: 'ضباب الصبح على سطوح بلودان', en: 'Morning mist over Bloudan rooftops' },
    places: [
      p(['المنتزهات والإطلالات', 'قعدات عالهوا مع إطلالة عالوادي.'], ['Viewpoints', 'Outdoor seating with valley views.']),
      p(['الزبداني', 'بساتين الفاكهة على بعد خطوة.'], ['Zabadani', 'Orchards just next door.']),
      p(['مشاوير الثلج', 'بالشتا، حسب تقرير الموسم.'], ['Snow trips', 'In winter, per the season report.']),
    ],
    eat: {
      ar: 'مشاوي القعدات، وفواكه الموسم من بساتين الزبداني.',
      en: "Grill gatherings and seasonal fruit from Zabadani's orchards.",
    },
  },
]

/** Arabic only, grouped by the city they start from. */
export const DAY_TRIPS: { from: string; items: [string, string][] }[] = [
  { from: 'damascus', items: [['بلودان والزبداني', 'هوا الجبل وبساتين الفاكهة.'], ['معلولا وصيدنايا', 'أديرة على الصخر وقرى القلمون.']] },
  { from: 'aleppo', items: [['قلعة سمعان', 'كنيسة وأطلال على تلة بريف حلب الغربي.']] },
  {
    from: 'latakia',
    items: [['كسب', 'ضيعة جبلية قرب البحر والغابات.'], ['صلنفة', 'مصيف الساحل، بارد بالصيف.'], ['قلعة صلاح الدين', 'مشوار نص نهار مع غدا بالحفة.']],
  },
]
