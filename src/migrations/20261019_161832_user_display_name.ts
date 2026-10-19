import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "display_name" varchar;`)
  // Existing accounts: correspondents get the public default for their first assigned city (never
  // their real name); staff keep their own name. Same rule as hooks/displayName for new accounts.
  await db.execute(sql`
   UPDATE "users" u SET "display_name" = CASE
     WHEN u."role" = 'correspondent' THEN COALESCE(
       'مراسل سوريا عن قرب في ' || (
         SELECT cl."name" FROM "users_rels" r
         JOIN "cities_locales" cl ON cl."_parent_id" = r."cities_id" AND cl."_locale" = 'ar'
         WHERE r."parent_id" = u."id" AND r."path" = 'assignedCities'
         ORDER BY r."order" LIMIT 1
       ),
       'مراسل سوريا عن قرب'
     )
     ELSE u."name"
   END
   WHERE u."display_name" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "display_name";`)
}
