// Starter guide content for the city pages (owner decision 2026-10-24: "no empty section").
// Shown only while the CMS has nothing of that kind for the city; anything an editor publishes
// replaces it. Places are long-standing or listed by published guides (Wikivoyage, In Your Pocket,
// TripAdvisor, Al Jazeera, Enab Baladi, SANA); dishes are what the city is known for. No prices,
// no safety claims (ق4). Every list carries the date it was compiled (ق3).
// Photos: keys into src/content/photos.json (files in public/guide).

export const GUIDE_CHECKED = '2026-10-24'

export type GuideKind = 'restaurant' | 'cafe' | 'sweets' | 'dish' | 'park'
type T = { ar: string; en: string }
export type GuideVenue = { kind: GuideKind; name: T; hood?: T; note: T; photo?: string }
export type GuideLore = { kind: 'secret' | 'joke' | 'proverb'; text: string; meaning?: string; teller: string }
export type CityGuide = { venues: GuideVenue[]; parks: GuideVenue[]; lore: GuideLore[]; gallery: string[] }

const v = (kind: GuideKind, ar: string, en: string, hoodAr: string, hoodEn: string, noteAr: string, noteEn: string, photo?: string): GuideVenue => ({
  kind,
  name: { ar, en },
  hood: hoodAr ? { ar: hoodAr, en: hoodEn } : undefined,
  note: { ar: noteAr, en: noteEn },
  photo,
})

// Humour from Syria's roads: slogans painted on buses and trucks, a genre everyone shares.
const ROAD: GuideLore[] = [
  { kind: 'joke', text: 'مكتوب على ظهر باص ريفي: "معذورة لو تكبّرت".', teller: 'نهفة من طرقات سوريا · صورة من مجموعة الموقع' },
  { kind: 'joke', text: 'وعلى ظهر شاحنة: "عين الحسود فيها عود".', teller: 'نهفة من طرقات سوريا' },
]
const PROVERBS: GuideLore[] = [
  { kind: 'proverb', text: 'جارك القريب ولا أخوك البعيد.', meaning: 'من يسكن بقربك يسندك قبل قريب يعيش بعيداً.', teller: 'مثل شامي متداول' },
  { kind: 'proverb', text: 'اللي ما بيعرف الصقر بيشويه.', meaning: 'من لا يعرف قيمة الشيء يضيّعه.', teller: 'مثل شامي متداول' },
]

export const GUIDE: Record<string, CityGuide> = {
  damascus: {
    venues: [
      v('restaurant', 'نارنج', 'Naranj', 'باب شرقي، الشارع المستقيم', 'Bab Sharqi, Straight Street', 'مطبخ دمشقي في بيت قديم، من أشهر مطاعم المدينة القديمة.', 'Damascene cooking in an old house, one of the Old City’s best-known restaurants.'),
      v('cafe', 'مقهى النوفرة', 'Al-Nawfara Cafe', 'شرق الجامع الأموي', 'East of the Umayyad Mosque', 'مقهى عمره نحو 250 سنة، قهوة وشاي بالكمون، وكان فيه الحكواتي.', 'A coffee house some 250 years old: coffee, cumin tea, and once the storyteller.', 'food-damascus-1'),
      v('sweets', 'بكداش', 'Bakdash', 'سوق الحميدية', 'Al-Hamidiyah Souq', 'بوظة عربية بالقشطة والفستق تُدقّ أمامك.', 'Pounded Arabic ice cream with cream and pistachio.', 'food-damascus-2'),
      v('cafe', 'المنهل: مكتبة ومخبز', 'Al-Manhal Bookstore & Bakery', 'المدينة القديمة', 'Old City', 'مقهى ومخبز ومكتبة في دكان عثماني، خبز على الحطب.', 'Cafe, bakery and library in an Ottoman-era shop, wood-fired bread.', 'food-damascus-3'),
      v('restaurant', 'بيت ستي', 'Beit Sitti', 'دمشق', 'Damascus', 'مطبخ بيتي شامي، ضمن أعلى المطاعم تقييماً في دمشق على تريب أدفايزر.', 'Home-style Damascene food, among Damascus’s top-rated restaurants on TripAdvisor.', 'food-damascus-4'),
      v('cafe', 'نازيرا خانم', 'Nazira Khanum Cafe', 'دمشق', 'Damascus', 'مقهى في بيت دمشقي، مدرج بين الأعلى تقييماً.', 'A cafe in a Damascene house, listed among the top rated.'),
    ],
    parks: [
      v('park', 'حديقة تشرين', 'Tishreen Park', 'بين المزة والأمويين', 'Between Mezzeh and Umayyad Square', 'أكبر حدائق دمشق، مساحات عشب وأشجار للعائلات.', 'Damascus’s largest park: lawns and trees for families.'),
      v('park', 'حديقة الجاحظ', 'Al-Jahez Park', 'المالكي، أبو رمانة', 'Malki, Abu Rummaneh', 'حديقة هادئة بين أحياء دمشق الحديثة.', 'A quiet garden among the modern districts.'),
      v('park', 'حديقة السبكي', 'Al-Sebki Park', 'الشعلان', 'Shaalan', 'حديقة صغيرة بالأشجار العالية وسط المدينة.', 'A small park of tall trees in the city centre.'),
    ],
    lore: [
      { kind: 'secret', text: 'الضوء المتسلل من سقف سوق الحميدية يمرّ من ثقوب يرويها الدمشقيون على أنها أثر رصاص قصف 1925.', teller: 'رواية دمشقية متداولة' },
      { kind: 'secret', text: 'في قاعة صلاة الجامع الأموي مقام يُنسب ليحيى بن زكريا (يوحنا المعمدان)، يزوره مسلمون ومسيحيون.', teller: 'من تاريخ الجامع' },
      { kind: 'secret', text: 'شجرة الكبّاد في أرض الديار ليست للزينة فقط: من ثمرها تُصنع مربى الكباد الدمشقية.', teller: 'من بيوت الشام' },
      { kind: 'proverb', text: 'الشام شامك إذا الدهر ضامك.', meaning: 'دمشق ملجؤك حين يقسو عليك الزمن.', teller: 'مثل شامي متداول' },
      ...PROVERBS,
      ...ROAD,
    ],
    gallery: ['u-damascus-0', 'u-damascus-1', 'u-damascus-2', 'u-damascus-3', 'u-damascus-4', 'u-damascus-5', 'u-damascus-6', 'u-damascus-7'],
  },
  aleppo: {
    venues: [
      v('restaurant', 'مطعم بيرويا', 'Beroea Restaurant', 'حلب', 'Aleppo', 'من أعلى مطاعم حلب تقييماً على تريب أدفايزر.', 'Among Aleppo’s top-rated restaurants on TripAdvisor.'),
      v('dish', 'الكبة الحلبية', 'Aleppan kibbeh', '', '', 'أكثر من عشرين نوعاً، من الكبة السفرجلية إلى كبة الكرز.', 'More than twenty kinds, from quince kibbeh to cherry kibbeh.', 'food-aleppo-1'),
      v('dish', 'كباب بالكرز', 'Cherry kebab', '', '', 'كباب بصلصة الكرز الحامض، طبق حلبي خالص.', 'Kebab in sour-cherry sauce, purely Aleppan.'),
      v('sweets', 'حلويات حلب', 'Aleppo sweets', 'باب الفرج والعزيزية', 'Bab al-Faraj and Aziziyeh', 'مبرومة وكول وشكور بالفستق الحلبي.', 'Mabrumeh and kol w shkor with Aleppo pistachio.', 'food-aleppo-3'),
    ],
    parks: [
      v('park', 'الحديقة العامة', 'Public Park', 'العزيزية', 'Aziziyeh', 'أقدم حدائق حلب، على ضفة نهر قويق.', 'Aleppo’s oldest park, on the Queiq river.'),
      v('park', 'حديقة السبيل', 'Al-Sabil Park', 'حي السبيل', 'Al-Sabil', 'حديقة أحياء للعائلات والجلسات المسائية.', 'A neighbourhood park for families and evening walks.'),
    ],
    lore: [
      { kind: 'secret', text: 'خانات حلب كانت فنادق التجار: الطابق الأرضي للبضائع والدواب، والعلوي للنوم.', teller: 'من تاريخ المدينة' },
      { kind: 'secret', text: 'صابون الغار الحلبي يُرصّ أبراجاً ويُترك أشهراً ليجفّ قبل البيع.', teller: 'من سوق المدينة' },
      { kind: 'proverb', text: 'حلب أمّ الطرب.', meaning: 'مدينة القدود الحلبية والموشحات.', teller: 'قول متداول' },
      ...PROVERBS,
      ...ROAD,
    ],
    gallery: ['gallery-aleppo-0', 'gallery-aleppo-1', 'gallery-aleppo-2', 'gallery-aleppo-3', 'gallery-aleppo-4', 'gallery-aleppo-5'],
  },
  latakia: {
    venues: [
      v('restaurant', 'السوار', 'Al Siwar', 'الكورنيش', 'Corniche', 'مطعم محلي معروف بإطلالة بحرية: مازة وكباب وسمك.', 'A well-known local restaurant with sea views: mezze, kebab and fish.'),
      v('restaurant', 'سبيرو', 'Spiro', 'الكورنيش', 'Corniche', 'مطعم سمك طازج، من أشهر مطاعم البحر في المدينة.', 'Fresh fish, one of the city’s best-known seafood places.'),
      v('restaurant', 'أبو دريد للمأكولات البحرية', 'Abu Duraid Seafood', 'اللاذقية', 'Latakia', 'مطعم سمك مدرج بين الأعلى تقييماً في اللاذقية.', 'A seafood restaurant listed among Latakia’s top rated.'),
      v('cafe', 'فيو', 'View Restaurant', 'الكورنيش الجنوبي', 'Southern Corniche', 'جلسة الغروب على البحر.', 'For sunset over the sea.'),
    ],
    parks: [
      v('park', 'الكورنيش الجنوبي', 'Southern Corniche', 'جنوب المدينة', 'South of the city', 'ممشى بحري طويل للمساء.', 'A long seafront walk for the evening.'),
      v('park', 'الشاطئ الأزرق', 'Blue Beach', 'شمال المدينة', 'North of the city', 'شاطئ الصيف والمنتجعات.', 'The summer beach and resorts.', 'park-latakia-1'),
    ],
    lore: [
      { kind: 'secret', text: 'في أوغاريت قرب اللاذقية وُجد رقيم يُعدّ من أقدم الأبجديات المعروفة، بثلاثين حرفاً مسمارياً.', teller: 'من تاريخ المدينة' },
      { kind: 'proverb', text: 'البحر ما بيعطي إلا للي بيصبر.', meaning: 'الرزق يحتاج صبراً، كالصيد.', teller: 'قول ساحلي متداول' },
      ...PROVERBS,
      ...ROAD,
    ],
    gallery: ['park-latakia-1', 'gallery2-latakia-0', 'gallery2-latakia-1', 'gallery2-latakia-2', 'gallery2-latakia-3', 'gallery2-latakia-4'],
  },
  bloudan: {
    venues: [
      v('restaurant', 'مورا غاردنز', 'Mora Gardens', 'بلودان', 'Bloudan', 'مطعم صيفي بين الأشجار، مدرج بين الأعلى تقييماً في بلودان.', 'A summer garden restaurant, among Bloudan’s top rated.', 'food-bloudan-0'),
      v('dish', 'تفاح بلودان', 'Bloudan apples', '', '', 'بساتين التفاح تملأ السفوح، والقطاف في الخريف.', 'Apple orchards cover the slopes; picking is in autumn.'),
      v('dish', 'مشاوي الجبل', 'Mountain grills', '', '', 'العائلات تشوي في المنتزهات أيام العطل.', 'Families grill in the parks on days off.', 'food-bloudan-2'),
    ],
    parks: [
      v('park', 'نبع بقّين', 'Bqeen spring', 'بين بلودان والزبداني', 'Between Bloudan and Zabadani', 'نبع ماء عذب ومنتزه للعائلات.', 'A fresh-water spring and family picnic spot.'),
      v('park', 'إطلالة بلودان', 'Bloudan viewpoint', 'أعلى البلدة', 'Above the town', 'إطلالة على سهل الزبداني.', 'Views over the Zabadani plain.'),
    ],
    lore: [
      { kind: 'secret', text: 'عُقد في بلودان مؤتمر عربي عام 1937 لنصرة فلسطين، ومنه عرف كثيرون اسم البلدة.', teller: 'من تاريخ البلدة' },
      ...PROVERBS,
      ...ROAD,
    ],
    gallery: ['gallery-bloudan-0', 'gallery-bloudan-1', 'gallery-bloudan-2', 'gallery2-bloudan-3'],
  },
  homs: {
    venues: [
      v('sweets', 'حلاوة الجبن', 'Halawet el jibn', 'سوق المدينة', 'The old souq', 'حلوى بالجبن والسميد والقشطة، وتتنازع حمص وحماة على أصلها.', 'Cheese-and-semolina rolls with cream; Homs and Hama both claim it.', 'food-homs-0'),
      v('dish', 'الكبة المشوية', 'Grilled kibbeh', '', '', 'كبة محشية تُشوى على الفحم.', 'Stuffed kibbeh grilled over charcoal.'),
      v('dish', 'الفطائر والمعجنات', 'Pastries', 'شارع الدبلان', 'Dablan Street', 'الشارع الرئيسي للمحلات والمقاهي.', 'The main street of shops and cafes.', 'food-homs-2'),
    ],
    parks: [
      v('park', 'بحيرة قطينة', 'Lake Homs (Qattinah)', 'جنوب غرب حمص', 'South-west of Homs', 'بحيرة على العاصي، نزهة الربيع.', 'A lake on the Orontes, a spring outing.'),
      v('park', 'ضفاف العاصي', 'Orontes banks', 'غرب المدينة', 'West of the city', 'بساتين ومقاهٍ على النهر.', 'Orchards and cafes along the river.'),
    ],
    lore: [
      { kind: 'secret', text: 'كنيسة أم الزنار في حمص تُنسب إليها حكاية زنار السيدة العذراء، وأساسها من القرن الأول بحسب رواية الكنيسة.', teller: 'من تاريخ الكنيسة' },
      ...PROVERBS,
      ...ROAD,
    ],
    gallery: ['gallery-homs-x1', 'food-homs-2', 'gallery2-homs-0', 'gallery2-homs-1', 'gallery2-homs-2', 'gallery2-homs-3', 'gallery2-homs-4'],
  },
  hama: {
    venues: [
      v('restaurant', 'أسباسيا', 'Aspasia', 'حماة', 'Hama', 'مطعم مدرج بين الأعلى تقييماً في حماة.', 'A restaurant listed among Hama’s top rated.'),
      v('sweets', 'حلاوة الجبن الحموية', 'Hama halawet el jibn', 'سوق المدينة', 'The souq', 'أشهر حلويات حماة، تُقدَّم بالقشطة والفستق.', 'Hama’s best-known sweet, with cream and pistachio.'),
      v('cafe', 'مقاهي النواعير', 'Cafes by the norias', 'ضفة العاصي', 'Orontes bank', 'جلسة على صوت النواعير.', 'Sitting to the creak of the waterwheels.', 'food-hama-2'),
    ],
    parks: [
      v('park', 'حديقة أم الحسن', 'Umm al-Hassan Park', 'قرب النواعير', 'By the norias', 'حديقة على العاصي بين النواعير.', 'A garden on the Orontes among the norias.'),
      v('park', 'ضفاف العاصي', 'Orontes banks', 'وسط المدينة', 'City centre', 'ممشى بين النواعير الخشبية.', 'A walk among the wooden waterwheels.', 'park-hama-1'),
    ],
    lore: [
      { kind: 'secret', text: 'صوت النواعير ليس عطلاً: الخشب يئن تحت الماء منذ قرون، وأهل حماة يسمّونه "نواح الناعورة".', teller: 'من أهل حماة' },
      ...PROVERBS,
      ...ROAD,
    ],
    gallery: ['gallery-hama-0', 'gallery-hama-1', 'gallery-hama-2', 'gallery-hama-3', 'gallery-hama-4', 'gallery-hama-5'],
  },
  tartous: {
    venues: [
      v('restaurant', 'أفريكانو', 'Africano', 'طرطوس', 'Tartus', 'مطعم مدرج بين الأعلى تقييماً في طرطوس.', 'Listed among Tartus’s top-rated restaurants.'),
      v('dish', 'سمك البحر', 'Fresh fish', 'الميناء', 'The port', 'سمك اليوم من قوارب الصيادين.', 'The day’s catch from the fishing boats.'),
      v('cafe', 'مقاهي الكورنيش', 'Corniche cafes', 'الكورنيش البحري', 'Seafront', 'جلسات مسائية على البحر.', 'Evening seats on the sea.'),
    ],
    parks: [
      v('park', 'الكورنيش البحري', 'Tartus seafront', 'وسط المدينة', 'City centre', 'ممشى طويل مقابل جزيرة أرواد.', 'A long walk facing Arwad island.'),
      v('park', 'جزيرة أرواد', 'Arwad island', 'قبالة الميناء', 'Off the port', 'جولة قارب قصيرة وأزقة بحرية.', 'A short boat ride and seaside lanes.', 'park-tartous-1'),
    ],
    lore: [
      { kind: 'secret', text: 'أرواد هي الجزيرة المأهولة الوحيدة في سوريا، وأهلها يبنون القوارب الخشبية حتى اليوم.', teller: 'من أهل الساحل' },
      ...PROVERBS,
      ...ROAD,
    ],
    gallery: ['gallery-tartous-1', 'gallery-tartous-2', 'gallery-tartous-3'],
  },
  idlib: {
    venues: [
      v('dish', 'زيت زيتون إدلب', 'Idlib olive oil', '', '', 'سهول الزيتون تحيط بالمدينة، والعصر في الخريف.', 'Olive groves ring the city; pressing is in autumn.', 'food-idlib-0'),
      v('dish', 'الزعتر والشنكليش', 'Zaatar and shanklish', '', '', 'فطور ريفي بزيت المعصرة.', 'A country breakfast with fresh-pressed oil.'),
    ],
    parks: [
      v('park', 'بساتين الزيتون', 'Olive groves', 'حول المدينة', 'Around the city', 'مشي بين الأشجار وقت القطاف.', 'A walk among the trees at harvest.'),
      v('park', 'المدن المنسية', 'The Dead Cities', 'جبل الزاوية', 'Jebel Zawiya', 'قرى حجرية بيزنطية بين الحقول.', 'Byzantine stone villages among the fields.', 'park-idlib-1'),
    ],
    lore: [
      { kind: 'secret', text: 'في إيبلا قرب إدلب وُجد أرشيف من نحو سبعة عشر ألف رقيم طيني يعود للألف الثالث قبل الميلاد.', teller: 'من تاريخ المنطقة' },
      ...PROVERBS,
      ...ROAD,
    ],
    gallery: ['park-idlib-1', 'gallery2-idlib-2', 'gallery2-idlib-4'],
  },
  daraa: {
    venues: [
      v('dish', 'المليحي الحوراني', 'Hauran mlehi', '', '', 'برغل ولحم ولبن جميد، طبق الولائم في حوران.', 'Bulgur, meat and dried-yoghurt sauce: Hauran’s feast dish.', 'food-daraa-0'),
      v('dish', 'خبز التنور', 'Tannour bread', '', '', 'رغيف يُخبز على جدار التنور الطيني.', 'Bread baked on the wall of a clay oven.'),
    ],
    parks: [
      v('park', 'وادي اليرموك', 'Yarmouk valley', 'غرب درعا', 'West of Daraa', 'وادٍ أخضر وشلالات تل شهاب.', 'A green valley and the Tell Shihab falls.'),
      v('park', 'سهل حوران', 'Hauran plain', 'حول المدينة', 'Around the city', 'حقول القمح وقت الحصاد.', 'Wheat fields at harvest.'),
    ],
    lore: [
      { kind: 'secret', text: 'مسرح بصرى بقي سليماً لأن قلعة بُنيت حوله، فحمته جدرانها قروناً.', teller: 'من تاريخ بصرى' },
      { kind: 'proverb', text: 'حوران أهراء روما.', meaning: 'سهل حوران كان مخزن القمح للإمبراطورية.', teller: 'قول تاريخي متداول' },
      ...ROAD,
    ],
    gallery: ['u-green-0', 'u-green-5', 'u-green-6', 'u-green-3'],
  },
  suwayda: {
    venues: [
      v('dish', 'المليحية', 'Mlehiyeh', '', '', 'منسف الجبل باللبن، طبق المناسبات.', 'The mountain’s yoghurt mansaf, for gatherings.', 'food-suwayda-0'),
      v('dish', 'عنب وتفاح الجبل', 'Mountain grapes and apples', '', '', 'كروم العنب وبساتين التفاح على الحجر البركاني.', 'Vineyards and apple orchards on volcanic stone.'),
    ],
    parks: [
      v('park', 'قنوات', 'Qanawat', 'شمال شرق السويداء', 'North-east of Suwayda', 'معابد بين أشجار البلوط.', 'Temples among oak trees.', 'park-suwayda-0'),
      v('park', 'ظهر الجبل', 'Dahr al-Jabal', 'شرق المدينة', 'East of the city', 'قمم وإطلالات على السهل.', 'Peaks with views over the plain.'),
    ],
    lore: [
      { kind: 'secret', text: 'بيوت الجبل القديمة مبنية من البازلت، وبعض أبوابها حجر واحد يدور على محور.', teller: 'من عمارة الجبل' },
      { kind: 'secret', text: 'الأزرق على الأبواب والجدران في قرى الجنوب لون محبوب منذ زمن، ويُقال إنه يرد العين.', teller: 'من قرى الجنوب · صور من مجموعة الموقع' },
      ...PROVERBS,
      ...ROAD,
    ],
    gallery: ['u-hauran-0', 'u-hauran-1', 'u-hauran-2', 'u-hauran-3', 'u-hauran-4', 'u-hauran-5', 'u-hauran-6', 'u-hauran-7'],
  },
  quneitra: {
    venues: [
      v('dish', 'عسل وزيتون الجولان', 'Golan honey and olives', '', '', 'خيرات القرى تحت جبل الشيخ.', 'Village produce under Mount Hermon.'),
    ],
    parks: [
      v('park', 'جبل الشيخ', 'Mount Hermon', 'غرب القنيطرة', 'West of Quneitra', 'ثلج معظم الشتاء.', 'Snow most of the winter.', 'park-quneitra-0'),
      v('park', 'سهول الجولان', 'Golan plains', 'حول المدينة', 'Around the city', 'مراعٍ خضراء في الربيع.', 'Green pastures in spring.', 'park-quneitra-1'),
    ],
    lore: [{ kind: 'secret', text: 'القنيطرة القديمة تُركت مهدّمة بعد 1974 لتبقى شاهداً.', teller: 'من تاريخ المدينة' }, ...PROVERBS, ...ROAD],
    gallery: ['gallery-quneitra-0', 'gallery-quneitra-4', 'gallery-quneitra-5'],
  },
  palmyra: {
    venues: [v('dish', 'تمر تدمر', 'Palmyra dates', 'البساتين', 'The oasis', 'نخيل الواحة يعطي تمراً في الخريف.', 'The oasis palms give dates in autumn.')],
    parks: [
      v('park', 'بساتين النخيل', 'Palm groves', 'جنوب المدينة القديمة', 'South of the ancient city', 'واحة نخيل وزيتون.', 'An oasis of palms and olives.', 'park-palmyra-0'),
      v('park', 'وادي القبور', 'Valley of the Tombs', 'غرب الأطلال', 'West of the ruins', 'أبراج المدافن في الصحراء.', 'Tower tombs in the desert.', 'park-palmyra-1'),
    ],
    lore: [{ kind: 'secret', text: 'اسم تدمر الإغريقي "بالميرا" يعني مدينة النخيل.', teller: 'من تاريخ المدينة' }, ...PROVERBS, ...ROAD],
    gallery: ['gallery-palmyra-0', 'gallery-palmyra-1', 'gallery-palmyra-2', 'gallery-palmyra-3', 'gallery-palmyra-4', 'gallery-palmyra-5'],
  },
  raqqa: {
    venues: [v('dish', 'سمك الفرات', 'Euphrates fish', 'ضفة النهر', 'Riverbank', 'سمك النهر مشوياً على الحطب.', 'River fish grilled over wood.')],
    parks: [
      v('park', 'ضفاف الفرات', 'Euphrates banks', 'جنوب المدينة', 'South of the city', 'نزهة المساء على النهر.', 'An evening walk on the river.'),
      v('park', 'بحيرة الفرات', 'Lake Euphrates', 'غرب الرقة', 'West of Raqqa', 'البحيرة وقلعة جعبر على شبه جزيرة.', 'The lake, with Qal’at Ja’bar on a peninsula.'),
    ],
    lore: [{ kind: 'secret', text: 'اتخذ هارون الرشيد الرقة عاصمة صيفية، وما زال جزء من سورها العباسي قائماً.', teller: 'من تاريخ المدينة' }, ...PROVERBS, ...ROAD],
    gallery: ['gallery-raqqa-0', 'gallery-raqqa-5', 'gallery2-raqqa-2', 'gallery2-raqqa-3', 'gallery2-raqqa-4'],
  },
  'deir-ez-zor': {
    venues: [
      v('sweets', 'الكليجة', 'Kleicha', '', '', 'معمول التمر والسمسم، حلوى العيد في دير الزور.', 'Date and sesame cookies, the Eid sweet of Deir ez-Zor.'),
      v('dish', 'سمك الفرات', 'Euphrates fish', '', '', 'سمك النهر على موائد المدينة.', 'River fish on the city’s tables.', 'food-deir-ez-zor-1'),
    ],
    parks: [v('park', 'ضفة الفرات', 'Euphrates bank', 'وسط المدينة', 'City centre', 'ممشى قرب بقايا الجسر المعلّق.', 'A walk by the remains of the suspension bridge.', 'park-deir-ez-zor-0')],
    lore: [{ kind: 'secret', text: 'الجسر المعلّق بُني أيام الانتداب الفرنسي وكان رمز المدينة، ودُمّر عام 2013.', teller: 'من تاريخ المدينة' }, ...PROVERBS, ...ROAD],
    gallery: ['gallery-deir-ez-zor-0', 'gallery-deir-ez-zor-1', 'gallery-deir-ez-zor-3', 'gallery-deir-ez-zor-4', 'gallery-deir-ez-zor-5'],
  },
  hasakah: {
    venues: [v('dish', 'خبز الصاج والقمح', 'Saj bread', '', '', 'الجزيرة سلّة قمح سوريا، والخبز على الصاج في البيوت.', 'The Jazira is Syria’s breadbasket; bread is baked on the saj.')],
    parks: [
      v('park', 'نهر الخابور', 'Khabur river', 'المدينة', 'The city', 'ضفاف خضراء وسط السهل.', 'Green banks in the plain.', 'park-hasakah-0'),
      v('park', 'حقول القطن والقمح', 'Cotton and wheat fields', 'حول المدينة', 'Around the city', 'سهول تمتد حتى الأفق.', 'Plains to the horizon.'),
    ],
    lore: [{ kind: 'secret', text: 'تل براك قرب الحسكة من أقدم المدن في العالم، وفيه "معبد العيون".', teller: 'من تاريخ المنطقة' }, ...PROVERBS, ...ROAD],
    gallery: ['gallery-hasakah-2', 'gallery-hasakah-3', 'gallery-hasakah-4'],
  },
  'mashta-al-helu': {
    venues: [v('dish', 'مشاوي الضيعة', 'Village grills', '', '', 'الغداء في المنتزهات تحت الصنوبر.', 'Lunch in the pine-shaded parks.')],
    parks: [v('park', 'غابات المشتى', 'Mashta forests', 'حول البلدة', 'Around the town', 'صنوبر وسنديان ومسارات مشي.', 'Pine, oak and walking paths.')],
    lore: [{ kind: 'secret', text: 'مشتى الحلو في قلب وادي النصارى، ومنها يُرى دير مار جرجس الحميراء وقلعة الحصن على التلال المقابلة.', teller: 'من جغرافيا الوادي' }, ...PROVERBS, ...ROAD],
    gallery: ['gallery-mashta-al-helu-0'],
  },
  mashquita: {
    venues: [v('dish', 'سمك البحيرة', 'Lake fish', 'بحيرة 16 تشرين', 'Lake 16 Tishreen', 'مطاعم تطل على البحيرة.', 'Restaurants overlooking the lake.', 'food-mashquita-0')],
    parks: [v('park', 'بحيرة 16 تشرين', 'Lake 16 Tishreen', 'تحت البلدة', 'Below the town', 'بحيرة السد بين التلال.', 'The dam lake among the hills.')],
    lore: [{ kind: 'secret', text: 'بحيرة مشقيتا ليست طبيعية: هي بحيرة سد بُني على نهر الكبير الشمالي.', teller: 'من الجغرافيا' }, ...PROVERBS, ...ROAD],
    gallery: ['gallery-mashquita-0', 'gallery-mashquita-1', 'gallery-mashquita-2', 'gallery-mashquita-3', 'gallery-mashquita-4', 'gallery-mashquita-5'],
  },
  kasab: {
    venues: [v('dish', 'مونة كسب', 'Kessab preserves', '', '', 'دبس وزيتون ومربيات من القرى الأرمنية.', 'Molasses, olives and jams from the Armenian villages.')],
    parks: [
      v('park', 'غابات الفرنلق', 'Frunloq forest', 'جنوب كسب', 'South of Kessab', 'محمية صنوبر ومسارات مشي.', 'A pine reserve with walking paths.'),
      v('park', 'شاطئ السمرا', 'Samra beach', 'غرب كسب', 'West of Kessab', 'شاطئ صخري تحت الجبل.', 'A rocky beach below the mountain.', 'park-kasab-1'),
    ],
    lore: [{ kind: 'secret', text: 'من جبل الأقرع فوق كسب ترى البحر وجبال لواء إسكندرون معاً في يوم صافٍ.', teller: 'من أهل الجبل' }, ...PROVERBS, ...ROAD],
    gallery: ['gallery-kasab-1', 'gallery-kasab-2', 'gallery-kasab-3', 'gallery-kasab-4', 'gallery-kasab-5'],
  },
  slunfeh: {
    venues: [v('dish', 'مشاوي صلنفة', 'Slenfeh grills', '', '', 'العائلات تشوي في المنتزهات صيفاً.', 'Families grill in the parks in summer.')],
    parks: [
      v('park', 'قمة النبي يونس', 'Nabi Younes peak', 'شرق صلنفة', 'East of Slenfeh', 'أعلى قمة في جبال الساحل.', 'The highest peak of the coastal mountains.'),
      v('park', 'غابات صلنفة', 'Slenfeh forests', 'حول البلدة', 'Around the town', 'صنوبر وسنديان وهواء بارد.', 'Pine, oak and cool air.'),
    ],
    lore: [{ kind: 'secret', text: 'في الشتاء يغطي الثلج صلنفة أحياناً، وهي على البحر بساعة سيارة فقط.', teller: 'من أهل الساحل' }, ...PROVERBS, ...ROAD],
    gallery: ['gallery2-slunfeh-0'],
  },
  zabadani: {
    venues: [
      v('dish', 'كرز وتفاح الزبداني', 'Zabadani cherries and apples', 'سهل الزبداني', 'Zabadani plain', 'موسم الكرز في أوائل الصيف.', 'Cherry season is in early summer.'),
      v('dish', 'مقاهي نبع بردى', 'Barada spring cafes', 'نبع بردى', 'Barada spring', 'جلسات على الماء.', 'Seats by the water.'),
    ],
    parks: [
      v('park', 'نبع بردى', 'Barada spring', 'جنوب الزبداني', 'South of Zabadani', 'منبع النهر الذي يعبر دمشق.', 'The source of the river that crosses Damascus.'),
      v('park', 'سهل الزبداني', 'Zabadani plain', 'المدينة', 'The town', 'بساتين بين جبلين.', 'Orchards between two mountains.', 'park-zabadani-1'),
    ],
    lore: [{ kind: 'secret', text: 'قطار دمشق ــ الزبداني البخاري كان يحمل المصطافين أيام الجمعة.', teller: 'من ذاكرة المصيف' }, ...PROVERBS, ...ROAD],
    gallery: ['gallery-zabadani-5', 'gallery2-zabadani-0', 'gallery2-zabadani-1', 'gallery2-zabadani-2', 'gallery2-zabadani-3', 'gallery2-zabadani-4'],
  },
}

/** Stories for the blog (photo essays from the site's own collection). */
export type GuideStory = { slug: string; category: 'story' | 'food' | 'firstVisit' | 'trails'; city?: string; date: string; title: T; body: T[]; photos: string[] }

export const STORIES: GuideStory[] = [
  {
    slug: 'damascus-from-qasioun',
    category: 'story',
    city: 'damascus',
    date: '2026-10-24',
    title: { ar: 'دمشق من فوق: مدينة تمتد حتى الضباب', en: 'Damascus from above: a city that runs into the haze' },
    body: [
      { ar: 'من جبل قاسيون تبدو دمشق بحراً من الأسطح البيج، تخرج منه المآذن وقبة الجامع الأموي، ثم تذوب المدينة في ضباب الغوطة.', en: 'From Mount Qasioun Damascus is a sea of beige rooftops, broken by minarets and the dome of the Umayyad Mosque, until the city melts into the Ghouta haze.' },
      { ar: 'ومن الطائرة تظهر الأحياء الحديثة شبكة شوارع تلتقي في ساحات دائرية، والحدائق بقع خضراء بينها.', en: 'From the air the modern districts become a web of streets meeting at roundabouts, with parks as green patches between them.' },
      { ar: 'وفي الشتاء، حين يتساقط الثلج، تتغير المدينة كلها: النخيل أبيض، والقباب بيضاء، والتكاسي الصفراء وحدها تحمل اللون.', en: 'And when snow falls in winter the whole city changes: white palms, white domes, and only the yellow taxis keep their colour.' },
    ],
    photos: ['u-damascus-8', 'u-damascus-9', 'u-damascus-10', 'u-damascus-11', 'u-damascus-12'],
  },
  {
    slug: 'inside-damascene-houses',
    category: 'story',
    city: 'damascus',
    date: '2026-10-24',
    title: { ar: 'البيت الدمشقي من الداخل: خشب وحجر ونارنج', en: 'Inside the Damascene house: wood, stone and bitter orange' },
    body: [
      { ar: 'من الحارة لا ترى شيئاً: باب خشب في جدار. ومن الداخل أرض ديار ببحرة، وأشجار نارنج وكبّاد، وإيوان مفتوح على السماء.', en: 'From the lane you see nothing but a wooden door in a wall. Inside: a courtyard with a fountain, bitter orange and citron trees, and an iwan open to the sky.' },
      { ar: 'الواجهات من الداخل تحكي: حجر أبلق أسود وأبيض، وزخارف حجرية ملوّنة بالأزرق والأحمر، وأقواس فوق نوافذ حديد مشغول.', en: 'The inner facades tell the story: black-and-white ablaq stone, carved panels painted blue and red, arches over wrought-iron windows.' },
      { ar: 'وفي القاعات سقوف خشبية مدهونة باليد، وقطع أثاث مطعّمة بالصدف، وثريات نحاسية تتدلى من القبة.', en: 'In the halls: hand-painted wooden ceilings, mother-of-pearl furniture and brass lanterns hanging from the dome.' },
    ],
    photos: ['u-house-0', 'u-house-1', 'u-house-2', 'u-house-3', 'u-house-4', 'u-house-5', 'u-house-6'],
  },
  {
    slug: 'blue-of-the-south',
    category: 'trails',
    city: 'suwayda',
    date: '2026-10-24',
    title: { ar: 'أزرق الجنوب: باص وباب وبلاطة', en: 'The blue of the south: a bus, a door and a tile' },
    body: [
      { ar: 'في قرى حوران وجبل العرب يتكرر لون واحد: أزرق على الأبواب، وعلى الجدران المقشورة، وعلى جرّار قديم، وحتى على صحن الستلايت.', en: 'In the villages of Hauran and the Jabal one colour keeps returning: blue on the doors, on peeling walls, on an old tractor, even on the satellite dish.' },
      { ar: 'على ظهر باص ريفي كُتب "معذورة لو تكبّرت"، وهذه من نهفات الطرقات السورية التي يحفظها الجميع.', en: 'The back of a rural bus reads “Forgive her if she’s proud”, one of the road slogans every Syrian knows.' },
      { ar: 'وبين الحجر البازلتي الأسود يبدو الأزرق أوضح، كأنه نافذة على السماء.', en: 'Against the black basalt the blue looks brighter, like a window onto the sky.' },
    ],
    photos: ['u-hauran-0', 'u-hauran-1', 'u-hauran-2', 'u-hauran-3', 'u-hauran-4', 'u-hauran-5', 'u-hauran-6', 'u-hauran-7', 'u-hauran-8'],
  },
  {
    slug: 'green-of-the-jabal',
    category: 'trails',
    city: 'suwayda',
    date: '2026-10-24',
    title: { ar: 'أخضر الجبل: زيتون ولوز وأعمدة', en: 'Green of the Jabal: olives, almonds and columns' },
    body: [
      { ar: 'في الربيع يخضرّ كل شيء حول الأعمدة الرومانية في الجنوب: عشب بين الحجارة، وزيتون، وأبواب مدهونة بالأخضر الفاتح.', en: 'In spring everything around the Roman columns of the south turns green: grass between the stones, olives, doors painted pale green.' },
      { ar: 'والضيافة أخضر أيضاً: صحن لوز أخضر مع كاسة شاي، على الطاولة قبل أي كلام.', en: 'Hospitality is green too: a plate of green almonds with a glass of tea, on the table before anything is said.' },
    ],
    photos: ['u-green-0', 'u-green-1', 'u-green-2', 'u-green-3', 'u-green-4', 'u-green-5', 'u-green-6', 'u-green-7', 'u-green-8'],
  },
  {
    slug: 'colours-of-syrian-cities',
    category: 'story',
    date: '2026-10-24',
    title: { ar: 'ألوان المدن: وردي وأصفر', en: 'City colours: pink and yellow' },
    body: [
      { ar: 'لكل مدينة لون إذا نظرت عن قرب. شرفات حجرية وردية، ونوافذ بخشب مقفل، وتوت أبيض في الصيف، ولحف مزهّرة مكدّسة.', en: 'Every city has a colour if you look closely. Pink stone balconies, shuttered windows, white mulberries in summer, piles of flowered quilts.' },
      { ar: 'والأصفر: سيارة قديمة على طرف التلة، وجدار مدهون بزخرفة يدوية، وأرضية رخام بنجوم متشابكة، وواجهة قصر العظم بأبلقها.', en: 'And yellow: an old car at the edge of a hill, a hand-painted wall motif, a marble floor of interlocking stars, the ablaq facade of the Azm Palace.' },
    ],
    photos: ['u-pink-0', 'u-pink-1', 'u-pink-2', 'u-pink-3', 'u-pink-4', 'u-yellow-0', 'u-yellow-1', 'u-yellow-2', 'u-yellow-3'],
  },
]
