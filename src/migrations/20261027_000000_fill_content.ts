import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { FILL_CHECKED, RURAL_FILL } from './data/rural-fill-2026-10-27'
import { RURAL_FOOD, RURAL_STAYS, STAYS_FILL } from './data/stays-fill-2026-10-27'

// Content migration (owner request 2026-10-26: "fill the site, leave nothing empty"):
// 1. Every countryside page gets sourced spots (nature, ruins, food, stays, picnic), its map centre,
//    distance and sources (src/migrations/data/rural-fill-2026-10-27.ts).
// 2. Cities without hotels get the hotels from the Ministry of Tourism directory, for information only
//    (no booking link; ق5) (src/migrations/data/stays-fill-2026-10-27.ts).
// Fill-only and idempotent like 20261026_080000_rural_content: matches on slugs and names, skips rows
// that already exist, never overwrites a value an editor entered (sources are appended, not replaced).

const spotId = (slug: string, i: number) => `fill-${slug}-${i + 1}`

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const trip of RURAL_FILL) {
    if (trip.lat != null && trip.lng != null) {
      await db.execute(sql`UPDATE "day_trips" SET "lat" = ${trip.lat}, "lng" = ${trip.lng} WHERE "slug" = ${trip.slug} AND "lat" IS NULL;`)
    }
    if (trip.distance) {
      await db.execute(sql`UPDATE "day_trips" SET "distance_note" = ${trip.distance} WHERE "slug" = ${trip.slug} AND ("distance_note" IS NULL OR "distance_note" = '');`)
    }
    const sources = trip.sources.join('\n')
    await db.execute(sql`
      UPDATE "day_trips" SET "sources" = CASE WHEN "sources" IS NULL OR "sources" = '' THEN ${sources} ELSE "sources" || ${`\n${sources}`} END
      WHERE "slug" = ${trip.slug} AND ("sources" IS NULL OR position(${trip.sources[0]!} in "sources") = 0);`)
    await db.execute(sql`
      UPDATE "day_trips" SET "checked_at" = ${FILL_CHECKED}
      WHERE "slug" = ${trip.slug} AND ("checked_at" IS NULL OR "checked_at" < ${FILL_CHECKED});`)

    const extra: [kind: string, name: string, note: string][] = [
      ...RURAL_STAYS.filter(([s]) => s === trip.slug).map(([, name, note]) => ['stay', name, note] as [string, string, string]),
      ...RURAL_FOOD.filter(([s]) => s === trip.slug).map(([, name, note]) => ['food', name, note] as [string, string, string]),
    ]
    const spots = [...trip.spots, ...extra.map(([kind, name, note]) => [kind, name, note, null, null] as const)]
    for (const [i, [kind, name, note, lat, lng]] of spots.entries()) {
      await db.execute(sql`
        INSERT INTO "day_trips_spots" ("_order", "_parent_id", "id", "kind", "name", "note", "lat", "lng")
        SELECT COALESCE((SELECT max(s."_order") FROM "day_trips_spots" s WHERE s."_parent_id" = t."id"), 0) + 1,
               t."id", ${spotId(trip.slug, i)}, ${kind}, ${name}, ${note}, ${lat}, ${lng}
        FROM "day_trips" t
        WHERE t."slug" = ${trip.slug}
          AND NOT EXISTS (SELECT 1 FROM "day_trips_spots" s WHERE s."_parent_id" = t."id" AND (s."name" = ${name} OR s."id" = ${spotId(trip.slug, i)}));`)
    }
  }

  for (const stay of STAYS_FILL) {
    await db.execute(sql`
      WITH c AS (
        SELECT c."id" FROM "cities" c
        WHERE c."slug" = ${stay.city}
          AND NOT EXISTS (
            SELECT 1 FROM "stays" s JOIN "stays_locales" l ON l."_parent_id" = s."id"
            WHERE s."city_id" = c."id" AND l."title" = ${stay.title})
      ), ins AS (
        INSERT INTO "stays" ("city_id") SELECT "id" FROM c RETURNING "id"
      )
      INSERT INTO "stays_locales" ("_parent_id", "_locale", "title", "description")
      SELECT "id", 'ar', ${stay.title}, ${stay.description} FROM ins;`)
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DELETE FROM "day_trips_spots" WHERE "id" LIKE 'fill-%';`)
  for (const stay of STAYS_FILL) {
    await db.execute(sql`
      DELETE FROM "stays" s USING "stays_locales" l, "cities" c
      WHERE l."_parent_id" = s."id" AND c."id" = s."city_id" AND c."slug" = ${stay.city}
        AND l."title" = ${stay.title} AND l."description" = ${stay.description} AND s."ahleen_url" IS NULL;`)
  }
}
