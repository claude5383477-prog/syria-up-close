import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

// "عدسات" for every city (owner request 2026-10-29: "add each city's own videos from social media").
// Public YouTube videos shown only through YouTube's official embed, with the creator's name and a link
// to the original (the rule in SPEC.md). Each one was checked on 2026-10-29 through YouTube's oEmbed
// (title and channel below are YouTube's own); travel and walking videos only, no news or politics.
// Cities with nothing suitable found (Suwayda, Raqqa) keep the dashed "awaiting" card.
// Idempotent: skips a video already in the CMS (by its YouTube id) and a city that does not exist.

type V = { city: string; id: string; author: string; ar: string; en: string }

export const CITY_VIDEOS: V[] = [
  { city: 'damascus', id: 'kNwYhejBW5I', author: 'Arab Diaries', ar: 'جولة مشي في القيمرية', en: 'Damascus, Qimaria Street walking tour' },
  { city: 'damascus', id: 'Q_Xu_0qMUts', author: 'Arab Diaries', ar: 'جولة مشي في سوق الحميدية', en: 'Damascus, Al-Hamidiyah Market walking tour' },
  { city: 'damascus', id: 'Whc4fSebZl4', author: 'Safartas', ar: 'أسواق دمشق القديمة مشياً', en: 'Damascus old markets walking tour' },
  { city: 'damascus', id: '-zfetDlII3w', author: 'Traveling Solo Logs', ar: 'دمشق وقصر العظم', en: 'Exploring Damascus and Al Azem Palace' },
  { city: 'aleppo', id: 'mx8JL0preGQ', author: 'Safartas', ar: 'أسواق حلب بعد الترميم', en: 'Aleppo, walking the restored souks' },
  { city: 'aleppo', id: 'vcsMdJC7qEA', author: 'Safartas', ar: 'من باب أنطاكية إلى قلعة حلب', en: 'Aleppo, from Antioch Gate to the Citadel' },
  { city: 'aleppo', id: 'gK9gXTIa07o', author: 'Safartas', ar: 'جولة في حي الزبدية', en: 'Aleppo, Zibdiyeh neighbourhood walking tour' },
  { city: 'aleppo', id: 'oakT7rgocfk', author: 'Safartas', ar: 'وسط حلب مشياً', en: 'Aleppo downtown walking tour' },
  { city: 'homs', id: 'GLyKu_JjtHI', author: 'Safartas', ar: 'أسواق حمص القديمة', en: 'Homs, walking through the old markets' },
  { city: 'homs', id: 'kk5YpNRUa-8', author: 'Safartas', ar: 'شارع الدبلان في حمص', en: 'Homs, Dablan Street walking tour' },
  { city: 'hama', id: 'n413S512HSM', author: 'Arab Diaries', ar: 'وسط حماة مشياً', en: 'Hama downtown walking tour' },
  { city: 'hama', id: 'Rvk3uBLPd9E', author: 'Jarid Boosters', ar: 'نواعير حماة: دواليب عمرها أكثر من 500 سنة', en: 'The norias of Hama, 500-year-old water wheels' },
  { city: 'hama', id: '2uHhPDFRum0', author: 'rndomn8', ar: 'نواعير حماة', en: 'Waterwheel norias of Hama' },
  { city: 'latakia', id: 'JyLp47EjWw8', author: 'Arab Diaries', ar: 'وسط اللاذقية مشياً', en: 'Latakia downtown walking tour' },
  { city: 'latakia', id: '8H9jkWaum8c', author: 'Yahya Khan', ar: 'اللاذقية: رحلة في المدينة', en: 'Latakia, a travel vlog' },
  { city: 'tartous', id: '6Za256dPOm0', author: 'Arab Diaries', ar: 'صباح في طرطوس', en: 'Tartus morning walking tour' },
  { city: 'tartous', id: 'rxrTJ2RozK8', author: 'Safartas', ar: 'جزيرة أرواد مشياً', en: 'Arwad, Syria’s only inhabited island' },
  { city: 'tartous', id: 'eZZTGvbg1GA', author: 'Kirk79', ar: 'شاطئ طرطوس وأرواد', en: 'Tartous seashore and Arwad' },
  { city: 'idlib', id: '-2WPXWhEivo', author: 'Safartas', ar: 'قبل عيد الأضحى في مولات الدانا', en: 'Before Eid al-Adha, Al-Dana malls (Idlib)' },
  { city: 'daraa', id: 'B5V96L6T4Wg', author: 'Austin Davis Vlogs', ar: 'مسرح بصرى الروماني', en: 'Bosra, the best-preserved Roman theatre' },
  { city: 'daraa', id: 'kA4fkEYp08I', author: 'The Traveling ZAM', ar: 'بصرى: مدينة الحجر الأسود', en: 'Bosra, the black stone city' },
  { city: 'daraa', id: '0fGc7iZ0a3I', author: 'وارف كاتبي - Waref Katbi', ar: 'زرت درعا لأول مرة', en: 'My first visit to Daraa' },
  { city: 'quneitra', id: 'EEzO3m0dx04', author: 'Safartas', ar: 'مدينة السلام (القنيطرة الجديدة) بالسيارة', en: 'Al-Salam City (New Quneitra) driving tour' },
  { city: 'deir-ez-zor', id: '83wQs1lVRh8', author: 'Rozana Media - روزنة للإعلام', ar: 'الجسر المعلّق في دير الزور', en: 'The suspension bridge of Deir ez-Zor' },
  { city: 'hasakah', id: 'XgBIRzzfpro', author: 'Safartas', ar: 'جولة مشي في الحسكة', en: 'Al-Hasakah walking tour' },
  { city: 'hasakah', id: 'KuGYTLKj5a8', author: 'Safartas', ar: 'وسط الحسكة مشياً', en: 'Al-Hasakah downtown walking tour' },
  { city: 'hasakah', id: '5ddJE0sYdQo', author: 'Safartas', ar: 'سوق الغنم في الحسكة', en: 'Al-Hasakah sheep bazaar' },
]

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  for (const [i, v] of CITY_VIDEOS.entries()) {
    const exists = await payload.count({ collection: 'videos', where: { videoId: { equals: v.id } }, req, overrideAccess: true })
    if (exists.totalDocs) continue
    const city = (await payload.find({ collection: 'cities', where: { slug: { equals: v.city } }, limit: 1, depth: 0, req, overrideAccess: true })).docs[0]
    if (!city) continue
    const doc = await payload.create({
      collection: 'videos',
      req,
      overrideAccess: true,
      locale: 'ar',
      data: { url: `https://www.youtube.com/watch?v=${v.id}`, title: v.ar, author: v.author, city: city.id, order: i, _status: 'published' },
    })
    await payload.update({ collection: 'videos', id: doc.id, req, overrideAccess: true, locale: 'en', data: { title: v.en, _status: 'published' } })
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'videos', where: { videoId: { in: CITY_VIDEOS.map((v) => v.id) } }, req, overrideAccess: true })
}
