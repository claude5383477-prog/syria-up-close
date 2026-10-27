import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "places" ADD COLUMN "map_link" varchar;
  ALTER TABLE "places" ADD COLUMN "lat" numeric;
  ALTER TABLE "places" ADD COLUMN "lng" numeric;
  ALTER TABLE "stays" ADD COLUMN "map_link" varchar;
  ALTER TABLE "stays" ADD COLUMN "lat" numeric;
  ALTER TABLE "stays" ADD COLUMN "lng" numeric;
  ALTER TABLE "venues" ADD COLUMN "map_link" varchar;
  ALTER TABLE "venues" ADD COLUMN "lat" numeric;
  ALTER TABLE "venues" ADD COLUMN "lng" numeric;
  ALTER TABLE "_venues_v" ADD COLUMN "version_map_link" varchar;
  ALTER TABLE "_venues_v" ADD COLUMN "version_lat" numeric;
  ALTER TABLE "_venues_v" ADD COLUMN "version_lng" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "places" DROP COLUMN "map_link";
  ALTER TABLE "places" DROP COLUMN "lat";
  ALTER TABLE "places" DROP COLUMN "lng";
  ALTER TABLE "stays" DROP COLUMN "map_link";
  ALTER TABLE "stays" DROP COLUMN "lat";
  ALTER TABLE "stays" DROP COLUMN "lng";
  ALTER TABLE "venues" DROP COLUMN "map_link";
  ALTER TABLE "venues" DROP COLUMN "lat";
  ALTER TABLE "venues" DROP COLUMN "lng";
  ALTER TABLE "_venues_v" DROP COLUMN "version_map_link";
  ALTER TABLE "_venues_v" DROP COLUMN "version_lat";
  ALTER TABLE "_venues_v" DROP COLUMN "version_lng";`)
}
