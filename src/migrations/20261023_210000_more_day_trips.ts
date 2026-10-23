import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Content migration: the weekend trips of the 2026-10 redesign, for the cities that had none. Each
// is one of the city's own places (seed-content/cities.json), so nothing new is claimed. Inserted
// only where the city exists and the trip is not there yet, so it is safe on any database.
const TRIPS: [city: string, title: string, description: string][] = [
  ['damascus', 'نبع بردى', 'منبع النهر الذي يعبر دمشق.'],
  ['aleppo', 'سرجيلا والبارة', 'قرى بيزنطية حجرية وأهرامات صغيرة كانت مدافن.'],
  ['latakia', 'مشقيتا', 'بحيرة سد 16 تشرين بين التلال الخضراء.'],
  ['homs', 'قلعة الحصن', 'قلعة صليبية فوق تلة تطل على وادي النصارى.'],
  ['homs', 'مشتى الحلو', 'بلدة جبلية بين الصنوبر والسنديان.'],
  ['homs', 'دير مار جرجس الحميراء', 'دير قديم في الوادي تحت قلعة الحصن.'],
  ['hama', 'أفاميا', 'شارع أعمدة طويل في سهل الغاب.'],
  ['hama', 'قلعة مصياف', 'قلعة حجرية في بلدة جبلية غرب حماة.'],
  ['hama', 'قلعة شيزر', 'قلعة على حافة صخرية فوق العاصي.'],
  ['tartous', 'جزيرة أرواد', 'الجزيرة المأهولة الوحيدة في سوريا، والقارب إليها من الميناء.'],
  ['tartous', 'قلعة المرقب', 'قلعة من الحجر البازلتي الأسود تطل على البحر.'],
  ['tartous', 'برج صافيتا', 'برج صليبي فوق بلدة على تلة.'],
  ['tartous', 'عمريت', 'معبد فينيقي في الماء ومدافن حجرية قرب البحر.'],
  ['daraa', 'بصرى القديمة', 'مسرح روماني داخل قلعة، وشوارع من الحجر البازلتي.'],
  ['daraa', 'شلالات تل شهاب', 'شلال في وادي اليرموك غرب درعا.'],
  ['suwayda', 'شهبا', 'مدينة فيليب العربي بمسرحها وحماماتها.'],
  ['suwayda', 'قنوات', 'معابد رومانية بين أشجار البلوط.'],
  ['suwayda', 'قلعة صلخد', 'قلعة على مخروط بركاني في جنوب الجبل.'],
  ['quneitra', 'جبل الشيخ', 'قمة يغطيها الثلج معظم الشتاء.'],
  ['palmyra', 'بساتين النخيل', 'واحة نخيل وزيتون جنوب المدينة القديمة.'],
  ['raqqa', 'قلعة جعبر', 'قلعة على شبه جزيرة في بحيرة الفرات.'],
  ['raqqa', 'الرصافة', 'مدينة بيزنطية بأسوار وكنائس في البادية.'],
  ['deir-ez-zor', 'دورا أوروبوس', 'مدينة هلنستية فوق جرف على الفرات.'],
  ['deir-ez-zor', 'ماري', 'مدينة من الألف الثالث قبل الميلاد قرب البوكمال.'],
  ['hasakah', 'تل براك', 'تل أثري من أقدم المدن في الجزيرة السورية.'],
]

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const [i, [city, title, description]] of TRIPS.entries()) {
    await db.execute(sql`
      INSERT INTO "day_trips" ("from_city_id", "title", "description", "order")
      SELECT c."id", ${title}, ${description}, ${100 + i} FROM "cities" c
      WHERE c."slug" = ${city}
        AND NOT EXISTS (SELECT 1 FROM "day_trips" t WHERE t."from_city_id" = c."id" AND t."title" = ${title});`)
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const [city, title] of TRIPS) {
    await db.execute(sql`
      DELETE FROM "day_trips" t USING "cities" c
      WHERE t."from_city_id" = c."id" AND c."slug" = ${city} AND t."title" = ${title};`)
  }
}
