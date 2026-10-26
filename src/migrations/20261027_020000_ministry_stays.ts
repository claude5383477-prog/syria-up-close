import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";
import {
  MINISTRY_RURAL_STAYS,
  MINISTRY_STAYS,
} from "./data/ministry-stays-2026-10-27";
import { RURAL_STAYS, STAYS_FILL } from "./data/stays-fill-2026-10-27";

// Hotels as the Ministry of Tourism lists them (owner request 2026-10-27: "the hotels don't match the
// ministry"). Replaces the information-only hotels added by 20261027_000000_fill_content (some came
// from Wego, TripAdvisor or travel963) with the ministry's own directory, by governorate, with class
// and address. Bookable Ahleen hotels are untouched; a hotel already on Ahleen is not listed twice.
// Countryside: Bloudan's ministry hotels go on its page; the earlier countryside hotels that the
// ministry also lists now name it as the source.

const MOTS =
  "دليل المنشآت السياحية لوزارة السياحة (mots.gov.sy، تشرين الأول 2026)";
const WEGO = "دليل وزارة السياحة كما نقلته ويجو رحّال (تشرين الأول 2026)";
const describe = (type: string, stars: string, address: string) =>
  `${type}، ${stars}${address ? `، ${address}` : ""}. مصنّف في ${MOTS}. تأكد أنه يعمل قبل الحجز.`;

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. The earlier information-only hotels (exact rows that migration wrote, never an editor's).
  for (const stay of STAYS_FILL) {
    await db.execute(sql`
      DELETE FROM "stays" s USING "stays_locales" l, "cities" c
      WHERE l."_parent_id" = s."id" AND c."id" = s."city_id" AND c."slug" = ${stay.city}
        AND l."title" = ${stay.title} AND l."description" = ${stay.description} AND s."ahleen_url" IS NULL;`);
  }
  // 2. The ministry's hotels, skipping any title the city already has.
  for (const [city, title, type, stars, address] of MINISTRY_STAYS) {
    await db.execute(sql`
      WITH c AS (
        SELECT c."id" FROM "cities" c
        WHERE c."slug" = ${city}
          AND NOT EXISTS (
            SELECT 1 FROM "stays" s JOIN "stays_locales" l ON l."_parent_id" = s."id"
            WHERE s."city_id" = c."id" AND l."title" = ${title})
      ), ins AS (
        INSERT INTO "stays" ("city_id") SELECT "id" FROM c RETURNING "id"
      )
      INSERT INTO "stays_locales" ("_parent_id", "_locale", "title", "description")
      SELECT "id", 'ar', ${title}, ${describe(type, stars, address)} FROM ins;`);
  }
  // 3. Countryside.
  for (const [
    i,
    [trip, title, type, stars, address],
  ] of MINISTRY_RURAL_STAYS.entries()) {
    const id = `mots-${trip}-${i + 1}`;
    await db.execute(sql`
      INSERT INTO "day_trips_spots" ("_order", "_parent_id", "id", "kind", "name", "note")
      SELECT COALESCE((SELECT max(s."_order") FROM "day_trips_spots" s WHERE s."_parent_id" = t."id"), 0) + 1,
             t."id", ${id}, 'stay', ${title}, ${describe(type, stars, address)}
      FROM "day_trips" t
      WHERE t."slug" = ${trip}
        AND NOT EXISTS (SELECT 1 FROM "day_trips_spots" s WHERE s."_parent_id" = t."id" AND (s."name" = ${title} OR s."id" = ${id}));`);
  }
  for (const [, name] of RURAL_STAYS) {
    await db.execute(sql`
      UPDATE "day_trips_spots" SET "note" = replace("note", ${WEGO}, ${MOTS})
      WHERE "id" LIKE 'fill-%' AND "name" = ${name} AND position(${WEGO} in "note") > 0;`);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(
    sql`DELETE FROM "day_trips_spots" WHERE "id" LIKE 'mots-%';`,
  );
  for (const [city, title, type, stars, address] of MINISTRY_STAYS) {
    await db.execute(sql`
      DELETE FROM "stays" s USING "stays_locales" l, "cities" c
      WHERE l."_parent_id" = s."id" AND c."id" = s."city_id" AND c."slug" = ${city}
        AND l."title" = ${title} AND l."description" = ${describe(type, stars, address)} AND s."ahleen_url" IS NULL;`);
  }
  for (const stay of STAYS_FILL) {
    await db.execute(sql`
      WITH c AS (SELECT "id" FROM "cities" WHERE "slug" = ${stay.city}), ins AS (
        INSERT INTO "stays" ("city_id") SELECT "id" FROM c RETURNING "id"
      )
      INSERT INTO "stays_locales" ("_parent_id", "_locale", "title", "description")
      SELECT "id", 'ar', ${stay.title}, ${stay.description} FROM ins;`);
  }
  for (const [, name] of RURAL_STAYS) {
    await db.execute(
      sql`UPDATE "day_trips_spots" SET "note" = replace("note", ${MOTS}, ${WEGO}) WHERE "id" LIKE 'fill-%' AND "name" = ${name};`,
    );
  }
}
