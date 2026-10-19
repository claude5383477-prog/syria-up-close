import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "approved" boolean DEFAULT false;
  CREATE INDEX "media_approved_idx" ON "media" USING btree ("approved");`)
  // Photos that already exist were public until now; keep them public. New uploads follow the rule.
  await db.execute(sql`UPDATE "media" SET "approved" = true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_approved_idx";
  ALTER TABLE "media" DROP COLUMN "approved";`)
}
