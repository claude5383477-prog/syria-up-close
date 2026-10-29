import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_venues_category" AS ENUM('tourist', 'popular');
  CREATE TYPE "public"."enum_venues_subcategory" AS ENUM('arab-house', 'levantine', 'rooftop', 'cafe', 'shawarma', 'grills', 'home-cooking', 'breakfast', 'falafel', 'manakish');
  CREATE TYPE "public"."enum__venues_v_version_category" AS ENUM('tourist', 'popular');
  CREATE TYPE "public"."enum__venues_v_version_subcategory" AS ENUM('arab-house', 'levantine', 'rooftop', 'cafe', 'shawarma', 'grills', 'home-cooking', 'breakfast', 'falafel', 'manakish');
  ALTER TABLE "venues" ADD COLUMN "category" "enum_venues_category";
  ALTER TABLE "venues" ADD COLUMN "subcategory" "enum_venues_subcategory";
  ALTER TABLE "_venues_v" ADD COLUMN "version_category" "enum__venues_v_version_category";
  ALTER TABLE "_venues_v" ADD COLUMN "version_subcategory" "enum__venues_v_version_subcategory";
  CREATE INDEX "venues_category_idx" ON "venues" USING btree ("category");
  CREATE INDEX "_venues_v_version_version_category_idx" ON "_venues_v" USING btree ("version_category");`)
  // Existing places get a default class (batch 4): cafes are the tourist class's cafes, restaurants
  // start as popular with no section. Editors refine both in the CMS.
  await db.execute(sql`
  UPDATE "venues" SET "category" = 'tourist', "subcategory" = 'cafe' WHERE "kind" = 'cafe' AND "category" IS NULL;
  UPDATE "venues" SET "category" = 'popular' WHERE "kind" = 'restaurant' AND "category" IS NULL;
  UPDATE "_venues_v" SET "version_category" = 'tourist', "version_subcategory" = 'cafe' WHERE "version_kind" = 'cafe' AND "version_category" IS NULL;
  UPDATE "_venues_v" SET "version_category" = 'popular' WHERE "version_kind" = 'restaurant' AND "version_category" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "venues_category_idx";
  DROP INDEX "_venues_v_version_version_category_idx";
  ALTER TABLE "venues" DROP COLUMN "category";
  ALTER TABLE "venues" DROP COLUMN "subcategory";
  ALTER TABLE "_venues_v" DROP COLUMN "version_category";
  ALTER TABLE "_venues_v" DROP COLUMN "version_subcategory";
  DROP TYPE "public"."enum_venues_category";
  DROP TYPE "public"."enum_venues_subcategory";
  DROP TYPE "public"."enum__venues_v_version_category";
  DROP TYPE "public"."enum__venues_v_version_subcategory";`)
}
