import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_day_trips_spots_kind" AS ENUM('stay', 'food', 'nature', 'ruins', 'picnic');
  CREATE TABLE "day_trips_spots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_day_trips_spots_kind" NOT NULL,
  	"name" varchar NOT NULL,
  	"note" varchar,
  	"lat" numeric,
  	"lng" numeric,
  	"image_id" integer
  );
  
  ALTER TABLE "cities" ADD COLUMN "parent_city_id" integer;
  ALTER TABLE "day_trips" ADD COLUMN "slug" varchar;
  ALTER TABLE "day_trips" ADD COLUMN "tag" varchar;
  ALTER TABLE "day_trips" ADD COLUMN "place_id" integer;
  ALTER TABLE "day_trips" ADD COLUMN "lat" numeric;
  ALTER TABLE "day_trips" ADD COLUMN "lng" numeric;
  ALTER TABLE "day_trips" ADD COLUMN "distance_note" varchar;
  ALTER TABLE "day_trips" ADD COLUMN "checked_at" timestamp(3) with time zone;
  ALTER TABLE "day_trips" ADD COLUMN "sources" varchar;
  ALTER TABLE "day_trips_spots" ADD CONSTRAINT "day_trips_spots_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "day_trips_spots" ADD CONSTRAINT "day_trips_spots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."day_trips"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "day_trips_spots_order_idx" ON "day_trips_spots" USING btree ("_order");
  CREATE INDEX "day_trips_spots_parent_id_idx" ON "day_trips_spots" USING btree ("_parent_id");
  CREATE INDEX "day_trips_spots_image_idx" ON "day_trips_spots" USING btree ("image_id");
  ALTER TABLE "cities" ADD CONSTRAINT "cities_parent_city_id_cities_id_fk" FOREIGN KEY ("parent_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "day_trips" ADD CONSTRAINT "day_trips_place_id_cities_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "cities_parent_city_idx" ON "cities" USING btree ("parent_city_id");
  CREATE UNIQUE INDEX "day_trips_slug_idx" ON "day_trips" USING btree ("slug");
  CREATE INDEX "day_trips_place_idx" ON "day_trips" USING btree ("place_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "day_trips_spots" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "day_trips_spots" CASCADE;
  ALTER TABLE "cities" DROP CONSTRAINT "cities_parent_city_id_cities_id_fk";
  
  ALTER TABLE "day_trips" DROP CONSTRAINT "day_trips_place_id_cities_id_fk";
  
  DROP INDEX "cities_parent_city_idx";
  DROP INDEX "day_trips_slug_idx";
  DROP INDEX "day_trips_place_idx";
  ALTER TABLE "cities" DROP COLUMN "parent_city_id";
  ALTER TABLE "day_trips" DROP COLUMN "slug";
  ALTER TABLE "day_trips" DROP COLUMN "tag";
  ALTER TABLE "day_trips" DROP COLUMN "place_id";
  ALTER TABLE "day_trips" DROP COLUMN "lat";
  ALTER TABLE "day_trips" DROP COLUMN "lng";
  ALTER TABLE "day_trips" DROP COLUMN "distance_note";
  ALTER TABLE "day_trips" DROP COLUMN "checked_at";
  ALTER TABLE "day_trips" DROP COLUMN "sources";
  DROP TYPE "public"."enum_day_trips_spots_kind";`)
}
