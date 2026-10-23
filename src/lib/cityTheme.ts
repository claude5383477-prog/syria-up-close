import type { Locale } from '@/lib/i18n'

/**
 * Each city page borrows its pattern and the shape of its photo frames from the city's historical
 * architecture: ablaq stone in Damascus, geometric stars in Aleppo, the norias of Hama, Ugarit's
 * cuneiform near Latakia, Abbasid brick on the Euphrates, and so on. Keyed by city slug.
 */
export type PatternId = 'ablaq' | 'star8' | 'noria' | 'cuneiform' | 'waves' | 'columns' | 'basalt' | 'brick' | 'byzantine' | 'roofs'
export type Arch = 'pointed' | 'round' | 'square'

export type CityTheme = { pattern: PatternId; arch: Arch; style: Record<Locale, string>; note: Record<Locale, string> }

const ROOFS: CityTheme = {
  pattern: 'roofs',
  arch: 'square',
  style: { ar: 'بيوت الحجر والقرميد', en: 'Stone houses, red-tiled roofs' },
  note: {
    ar: 'بيوت حجرية بسقوف من القرميد الأحمر بين الأشجار والبساتين، على سفوح الجبل.',
    en: 'Stone houses with red-tiled roofs among the trees and orchards of the mountain slopes.',
  },
}

const BASALT: CityTheme = {
  pattern: 'basalt',
  arch: 'round',
  style: { ar: 'البازلت الأسود', en: 'Black basalt' },
  note: {
    ar: 'حجر بركاني أسود تُبنى به البيوت والأقواس، ويعطي المكان لونه الداكن الذي يُعرف به.',
    en: 'Black volcanic stone used for houses and arches, giving the place its dark colour.',
  },
}

const BRICK: CityTheme = {
  pattern: 'brick',
  arch: 'pointed',
  style: { ar: 'الآجر على الفرات', en: 'Brick on the Euphrates' },
  note: {
    ar: 'الآجر المشوي مادة البناء القديمة في وادي الفرات والجزيرة، ويصنع بترتيبه نفسه زخارف على الجدران.',
    en: 'Fired brick is the old building material of the Euphrates valley and the Jazira; its own bond makes the patterns on the walls.',
  },
}

const THEMES: Record<string, CityTheme> = {
  damascus: {
    pattern: 'ablaq',
    arch: 'pointed',
    style: { ar: 'الأبلق الدمشقي', en: 'Damascene ablaq' },
    note: {
      ar: 'صفوف متناوبة من الحجر الأسود والأبيض في الواجهات، وبيوت تنفتح على أرض ديار فيها بحرة وشجر نارنج، وسقوف خشبية ملوّنة تُعرف بالعجمي.',
      en: 'Alternating courses of black and white stone on the facades, houses opening onto a courtyard with a fountain and bitter-orange trees, and painted wooden ceilings known as ajami.',
    },
  },
  aleppo: {
    pattern: 'star8',
    arch: 'pointed',
    style: { ar: 'الحجر الحلبي والزخارف الهندسية', en: 'Aleppo stone and geometric ornament' },
    note: {
      ar: 'حجر كلسي فاتح بُنيت به الخانات والأسواق المسقوفة، ونجوم وأطباق هندسية متشابكة على الأبواب والمحاريب، وقلعة على تل فوق المدينة.',
      en: 'Pale limestone caravanserais and covered souqs, interlaced geometric stars on doors and mihrabs, and a citadel on a hill above the city.',
    },
  },
  homs: {
    pattern: 'ablaq',
    arch: 'pointed',
    style: { ar: 'الأسود والأبيض', en: 'Black and white' },
    note: {
      ar: 'حجر بازلتي أسود يميّز المدينة القديمة، يتناوب مع الحجر الأبيض كما في جامع خالد بن الوليد.',
      en: 'Black basalt marks the old city, alternating with white stone as in the Khalid ibn al-Walid Mosque.',
    },
  },
  hama: {
    pattern: 'noria',
    arch: 'pointed',
    style: { ar: 'النواعير والبيوت على العاصي', en: 'Norias and houses on the Orontes' },
    note: {
      ar: 'عجلات خشبية ضخمة ترفع الماء من النهر إلى قنوات حجرية، وبيوت وقصور بأفنية تطل على العاصي.',
      en: 'Huge wooden wheels lift water from the river into stone aqueducts, beside courtyard houses and palaces on the Orontes.',
    },
  },
  latakia: {
    pattern: 'cuneiform',
    arch: 'square',
    style: { ar: 'أبجدية أوغاريت', en: 'The Ugarit alphabet' },
    note: {
      ar: 'في أوغاريت قربها عُثر على واحدة من أقدم الأبجديات، مكتوبة بحروف مسمارية على ألواح طين. نقوش هذه الصفحة من شكل تلك الحروف.',
      en: 'Nearby Ugarit gave one of the oldest alphabets, written in cuneiform on clay tablets. This page’s pattern takes the shape of those letters.',
    },
  },
  tartous: {
    pattern: 'waves',
    arch: 'pointed',
    style: { ar: 'حجر على البحر', en: 'Stone by the sea' },
    note: {
      ar: 'كاتدرائية وأسوار من العصور الوسطى بحجر قريب من البحر، وجزيرة أرواد أمامها.',
      en: 'A medieval cathedral and walls in stone by the sea, with Arwad island offshore.',
    },
  },
  idlib: {
    pattern: 'byzantine',
    arch: 'round',
    style: { ar: 'المدن المنسية', en: 'The Dead Cities' },
    note: {
      ar: 'قرى بيزنطية من الحجر الكلسي بأقواس نصف دائرية، بقيت جدرانها قائمة منذ قرون في سهول الزيتون.',
      en: 'Byzantine limestone villages with round arches, their walls still standing after centuries among the olive groves.',
    },
  },
  daraa: {
    ...BASALT,
    style: { ar: 'البازلت الحوراني', en: 'Hauran basalt' },
    note: {
      ar: 'مدن سهل حوران مبنية بالحجر البازلتي الأسود، وفي بصرى مسرح روماني محفوظ داخل قلعة.',
      en: 'The towns of the Hauran plain are built of black basalt, and Bosra keeps a Roman theatre inside a citadel.',
    },
  },
  suwayda: {
    ...BASALT,
    style: { ar: 'حجر الجبل الأسود', en: 'The black stone of the mountain' },
    note: {
      ar: 'بلدات رومانية من البازلت الأسود ما زالت مسكونة، بأقواس حجرية ومعابد بين أشجار البلوط.',
      en: 'Roman towns of black basalt still lived in, with stone arches and temples among the oaks.',
    },
  },
  quneitra: {
    ...BASALT,
    note: {
      ar: 'بيوت من الحجر البازلتي على هضبة الجولان، ومدينة قديمة تُركت مهدّمة كما هي.',
      en: 'Basalt houses on the Golan plateau, and an old town left in ruins as it was.',
    },
  },
  palmyra: {
    pattern: 'columns',
    arch: 'round',
    style: { ar: 'الأعمدة في البادية', en: 'Columns in the desert' },
    note: {
      ar: 'شارع أعمدة طويل ومعابد بحجر كلسي فاتح في قلب البادية. تضرر كثير منها بين 2015 و2017.',
      en: 'A long colonnaded street and temples of pale limestone in the heart of the desert. Many were badly damaged between 2015 and 2017.',
    },
  },
  raqqa: {
    ...BRICK,
    style: { ar: 'الآجر العباسي', en: 'Abbasid brick' },
    note: {
      ar: 'أسوار وبوابات من الآجر من العصر العباسي، مثل باب بغداد، وزخارفها من ترتيب الطوب نفسه.',
      en: 'Abbasid brick walls and gates such as Bab Baghdad, decorated by the way the bricks are laid.',
    },
  },
  'deir-ez-zor': BRICK,
  hasakah: {
    ...BRICK,
    arch: 'square',
    style: { ar: 'تلال الجزيرة', en: 'The tells of the Jazira' },
    note: {
      ar: 'تلال أثرية عمرها آلاف السنين، وبيوت ريفية من الطين والآجر في سهول الخابور.',
      en: 'Archaeological mounds thousands of years old, and farmhouses of mud and brick on the Khabur plains.',
    },
  },
  bloudan: ROOFS,
  zabadani: ROOFS,
  'mashta-al-helu': ROOFS,
  kasab: ROOFS,
  slunfeh: ROOFS,
  mashquita: { ...ROOFS, pattern: 'waves' },
}

/** The city's theme; a city added later without one gets the mountain-village theme. */
export function cityTheme(slug: string): CityTheme {
  return THEMES[slug] ?? ROOFS
}

export const THEMED_CITIES = Object.keys(THEMES)

/** CSS clip-path for a photo frame of the given arch. */
export function archClip(arch: Arch): string {
  if (arch === 'round') return 'inset(0 round 50% 50% 0 0 / 32% 32% 0 0)'
  if (arch === 'square') return 'inset(0 round 18px)'
  return 'polygon(0 100%,0 42%,3% 30%,8% 19%,16% 10%,26% 4.5%,37% 1.5%,46% .3%,50% 0,54% .3%,63% 1.5%,74% 4.5%,84% 10%,92% 19%,97% 30%,100% 42%,100% 100%)'
}
