import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// IndexNow de-duplication (SEO day 3, hooks/indexNow): when each public URL was last sent. Vercel
// functions share no memory, so the "not twice in 10 minutes" rule lives in the database. Not a Payload
// collection: nobody edits it, and it never appears in the admin or on a page.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "indexnow_log" (
  	"url" varchar PRIMARY KEY NOT NULL,
  	"sent_at" timestamp(3) with time zone NOT NULL
  );`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "indexnow_log";`)
}
