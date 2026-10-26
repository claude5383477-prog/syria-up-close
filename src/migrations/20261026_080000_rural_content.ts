import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Content migration for the countryside pages (owner decision 2026-10-26):
// 1. Resorts and Palmyra become part of a main city's countryside (cities.parent_city_id).
// 2. Every weekend trip gets a slug and a kind, so it has its own page at /inside/<slug>.
// 3. Resorts get their own trip, linked to their old city record (place_id) so its stays, venues
//    and photos show on the trip page.
// 4. Bloudan gets its sourced spots (syrmh.com 2024-01, syriantours.com, syriaphotoguide.com).
// Every statement matches on slugs and titles and skips rows that already changed, so it is safe
// on any database and never overwrites what an editor wrote.

const PARENT: [resort: string, parent: string][] = [
  ['bloudan', 'damascus'],
  ['zabadani', 'damascus'],
  ['palmyra', 'homs'],
  ['kasab', 'latakia'],
  ['slunfeh', 'latakia'],
  ['mashquita', 'latakia'],
  ['mashta-al-helu', 'tartous'],
]

// title → [slug, kind]
const SLUGS: [title: string, slug: string, tag: string][] = [
  ['بلودان', 'bloudan', 'مصيف'],
  ['الزبداني', 'zabadani', 'سهل وبساتين'],
  ['معلولا وصيدنايا', 'maaloula-saydnaya', 'أديرة'],
  ['نبع بردى', 'barada-spring', 'نبع'],
  ['قلعة سمعان', 'saint-simeon', 'آثار'],
  ['سرجيلا والبارة', 'serjilla-al-bara', 'آثار'],
  ['كسب', 'kasab', 'مصيف'],
  ['صلنفة', 'slunfeh', 'مصيف'],
  ['قلعة صلاح الدين', 'saladin-castle', 'آثار'],
  ['مشقيتا', 'mashquita', 'بحيرة'],
  ['قلعة الحصن', 'krak-des-chevaliers', 'آثار'],
  ['مشتى الحلو', 'mashta-al-helu', 'مصيف'],
  ['دير مار جرجس الحميراء', 'mar-georges-monastery', 'دير'],
  ['أفاميا', 'apamea', 'آثار'],
  ['قلعة مصياف', 'masyaf-castle', 'آثار'],
  ['قلعة شيزر', 'shaizar-castle', 'آثار'],
  ['جزيرة أرواد', 'arwad', 'جزيرة'],
  ['قلعة المرقب', 'margat-castle', 'آثار'],
  ['برج صافيتا', 'safita-tower', 'آثار'],
  ['عمريت', 'amrit', 'آثار'],
  ['بصرى القديمة', 'bosra', 'آثار'],
  ['شلالات تل شهاب', 'tell-shihab-falls', 'شلال'],
  ['شهبا', 'shahba', 'آثار'],
  ['قنوات', 'qanawat', 'آثار'],
  ['قلعة صلخد', 'salkhad-castle', 'آثار'],
  ['جبل الشيخ', 'mount-hermon', 'جبل'],
  ['تدمر', 'palmyra', 'واحة وآثار'],
  ['قلعة جعبر', 'qalat-jabar', 'آثار'],
  ['الرصافة', 'resafa', 'آثار'],
  ['دورا أوروبوس', 'dura-europos', 'آثار'],
  ['ماري', 'mari', 'آثار'],
  ['تل براك', 'tell-brak', 'آثار'],
]

// Resort trips: [from city, title, resort record, description]
const RESORT_TRIPS: [from: string, title: string, place: string, description: string][] = [
  ['damascus', 'الزبداني', 'zabadani', 'سهل أخضر بين جبلين، وبساتين كرز وتفاح.'],
  ['homs', 'تدمر', 'palmyra', 'واحة نخيل في قلب البادية، وأطلال مدينة زنوبيا.'],
]

type Spot = [kind: 'stay' | 'nature' | 'ruins', name: string, note: string, lat: number | null, lng: number | null]
const BLOUDAN_SPOTS: Spot[] = [
  ['stay', 'فندق بلودان الكبير', 'بناء كبير على تلة تطل على سهل الزبداني، افتُتح سنة 1935. تأكد من حالته وحجزك قبل السفر.', 33.72135, 36.12424],
  ['nature', 'نبع أبو زاد', 'من أهم ينابيع البلدة.', null, null],
  ['nature', 'نبع عين النسور', 'من ينابيع البلدة، تحت الجبل الذي يحمل الاسم نفسه.', null, null],
  ['nature', 'نبع عين البيضا', 'من ينابيع البلدة.', null, null],
  ['nature', 'نبع حزير', 'من ينابيع البلدة.', null, null],
  ['nature', 'جبل أبو الحن', 'قمة بارتفاع نحو 2302 م فوق البلدة.', null, null],
  ['nature', 'جبل عين النسور', 'قمة بارتفاع نحو 2217 م.', null, null],
  ['ruins', 'دير القديس جاورجيوس', 'دير قديم جُدّد بناؤه وصار كنيسة، وفيه لوحات ونقوش قديمة.', null, null],
  ['ruins', 'وادي مار إلياس', 'تحت البلدة، فيه بقايا أبنية قديمة.', null, null],
  ['ruins', 'جبل يونان', 'شمال بلودان، فيه بقايا معبد قديم وحجارة كبيرة منحوتة، وإطلالة على سرغايا.', null, null],
]
const BLOUDAN_SOURCES = [
  'موسوعة syrmh.com: بلودان (كانون الثاني 2024) — الينابيع والجبال والأديرة',
  'syriantours.com: فندق بلودان الكبير — الإحداثيات والمسافة من دمشق',
  'syriaphotoguide.com: بلودان والزبداني — إحداثيات البلدة',
].join('\n')

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const [resort, parent] of PARENT) {
    await db.execute(sql`
      UPDATE "cities" r SET "parent_city_id" = p."id" FROM "cities" p
      WHERE r."slug" = ${resort} AND p."slug" = ${parent} AND r."parent_city_id" IS NULL;`)
  }

  // "بلودان والزبداني" becomes Bloudan's trip; Zabadani gets its own below.
  await db.execute(sql`
    UPDATE "day_trips" SET "title" = 'بلودان', "description" = 'مصيف جبلي فوق سهل الزبداني، بهواء بارد وبساتين وينابيع.'
    WHERE "title" = 'بلودان والزبداني' AND "slug" IS NULL;`)
  // Palmyra joins Homs's countryside: its orchards trip becomes the Palmyra trip, starting from Homs.
  await db.execute(sql`
    UPDATE "day_trips" t SET "title" = 'تدمر', "description" = 'واحة نخيل في قلب البادية، وأطلال مدينة زنوبيا.', "from_city_id" = h."id"
    FROM "cities" h, "cities" p
    WHERE h."slug" = 'homs' AND p."slug" = 'palmyra' AND t."from_city_id" = p."id" AND t."title" = 'بساتين النخيل' AND t."slug" IS NULL;`)
  // Mashta al-Helu is in Tartus governorate.
  await db.execute(sql`
    UPDATE "day_trips" t SET "from_city_id" = c."id" FROM "cities" c, "cities" h
    WHERE c."slug" = 'tartous' AND h."slug" = 'homs' AND t."from_city_id" = h."id" AND t."title" = 'مشتى الحلو' AND t."slug" IS NULL;`)

  for (const [i, [from, title, , description]] of RESORT_TRIPS.entries()) {
    await db.execute(sql`
      INSERT INTO "day_trips" ("from_city_id", "title", "description", "order")
      SELECT c."id", ${title}, ${description}, ${50 + i} FROM "cities" c
      WHERE c."slug" = ${from} AND NOT EXISTS (SELECT 1 FROM "day_trips" t WHERE t."title" = ${title});`)
  }

  for (const [title, slug, tag] of SLUGS) {
    await db.execute(sql`
      UPDATE "day_trips" SET "slug" = ${slug}, "tag" = COALESCE("tag", ${tag})
      WHERE "id" = (SELECT min("id") FROM "day_trips" WHERE "title" = ${title} AND "slug" IS NULL)
        AND NOT EXISTS (SELECT 1 FROM "day_trips" WHERE "slug" = ${slug});`)
  }

  // Link resort trips to their old city records.
  for (const [resort] of PARENT) {
    await db.execute(sql`
      UPDATE "day_trips" t SET "place_id" = c."id" FROM "cities" c
      WHERE t."slug" = ${resort} AND c."slug" = ${resort} AND t."place_id" IS NULL;`)
  }

  await db.execute(sql`
    UPDATE "day_trips" SET "lat" = 33.72572, "lng" = 36.12707, "distance_note" = 'نحو 50 كم من دمشق',
      "checked_at" = '2026-10-26T00:00:00.000Z', "sources" = ${BLOUDAN_SOURCES}
    WHERE "slug" = 'bloudan' AND "lat" IS NULL;`)
  for (const [i, [kind, name, note, lat, lng]] of BLOUDAN_SPOTS.entries()) {
    await db.execute(sql`
      INSERT INTO "day_trips_spots" ("_order", "_parent_id", "id", "kind", "name", "note", "lat", "lng")
      SELECT ${i + 1}, t."id", ${`bloudan-${i + 1}`}, ${kind}, ${name}, ${note}, ${lat}, ${lng} FROM "day_trips" t
      WHERE t."slug" = 'bloudan' AND NOT EXISTS (SELECT 1 FROM "day_trips_spots" s WHERE s."_parent_id" = t."id" AND s."name" = ${name});`)
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DELETE FROM "day_trips_spots" WHERE "id" LIKE 'bloudan-%';`)
  for (const [, title] of RESORT_TRIPS) {
    await db.execute(sql`DELETE FROM "day_trips" WHERE "title" = ${title} AND "order" >= 50 AND "order" < 60;`)
  }
  for (const [, slug, tag] of SLUGS) {
    await db.execute(sql`UPDATE "day_trips" SET "slug" = NULL, "place_id" = NULL, "tag" = NULLIF("tag", ${tag}) WHERE "slug" = ${slug};`)
  }
  for (const [resort] of PARENT) {
    await db.execute(sql`UPDATE "cities" SET "parent_city_id" = NULL WHERE "slug" = ${resort};`)
  }
}
