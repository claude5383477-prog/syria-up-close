import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "status_items" ADD COLUMN "verified_by_name" varchar;
  ALTER TABLE "_status_items_v" ADD COLUMN "version_verified_by_name" varchar;
  ALTER TABLE "first_visit_pages" ADD COLUMN "last_verified_by_name" varchar;
  ALTER TABLE "_first_visit_pages_v" ADD COLUMN "version_last_verified_by_name" varchar;
  ALTER TABLE "season_reports" ADD COLUMN "author_name" varchar;
  ALTER TABLE "_season_reports_v" ADD COLUMN "version_author_name" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "status_items" DROP COLUMN "verified_by_name";
  ALTER TABLE "_status_items_v" DROP COLUMN "version_verified_by_name";
  ALTER TABLE "first_visit_pages" DROP COLUMN "last_verified_by_name";
  ALTER TABLE "_first_visit_pages_v" DROP COLUMN "version_last_verified_by_name";
  ALTER TABLE "season_reports" DROP COLUMN "author_name";
  ALTER TABLE "_season_reports_v" DROP COLUMN "version_author_name";`)
}
