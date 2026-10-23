import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_stories_category" AS ENUM('story', 'food', 'firstVisit', 'trails');
  CREATE TYPE "public"."enum__stories_v_version_category" AS ENUM('story', 'food', 'firstVisit', 'trails');
  CREATE TYPE "public"."enum_venues_kind" AS ENUM('restaurant', 'cafe', 'sweets', 'park');
  CREATE TYPE "public"."enum_venues_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__venues_v_version_kind" AS ENUM('restaurant', 'cafe', 'sweets', 'park');
  CREATE TYPE "public"."enum__venues_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__venues_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_city_lore_kind" AS ENUM('secret', 'joke', 'proverb');
  CREATE TYPE "public"."enum_city_lore_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__city_lore_v_version_kind" AS ENUM('secret', 'joke', 'proverb');
  CREATE TYPE "public"."enum__city_lore_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__city_lore_v_published_locale" AS ENUM('ar', 'en');
  CREATE TABLE "venues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"city_id" integer,
  	"kind" "enum_venues_kind",
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_venues_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "venues_locales" (
  	"name" varchar,
  	"neighbourhood" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_venues_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_city_id" integer,
  	"version_kind" "enum__venues_v_version_kind",
  	"version_image_id" integer,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__venues_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__venues_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_venues_v_locales" (
  	"version_name" varchar,
  	"version_neighbourhood" varchar,
  	"version_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "city_lore" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"city_id" integer,
  	"kind" "enum_city_lore_kind",
  	"text" varchar,
  	"meaning" varchar,
  	"teller_name" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_city_lore_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_city_lore_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_city_id" integer,
  	"version_kind" "enum__city_lore_v_version_kind",
  	"version_text" varchar,
  	"version_meaning" varchar,
  	"version_teller_name" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__city_lore_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__city_lore_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "city_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"city_id" integer NOT NULL,
  	"photo_id" integer NOT NULL,
  	"credit" varchar,
  	"shot_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "city_photos_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "stays" ALTER COLUMN "ahleen_url" DROP NOT NULL;
  ALTER TABLE "stories" ADD COLUMN "category" "enum_stories_category" DEFAULT 'story';
  ALTER TABLE "stories" ADD COLUMN "published_at" timestamp(3) with time zone;
  ALTER TABLE "_stories_v" ADD COLUMN "version_category" "enum__stories_v_version_category" DEFAULT 'story';
  ALTER TABLE "_stories_v" ADD COLUMN "version_published_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "venues_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "city_lore_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "city_photos_id" integer;
  ALTER TABLE "venues" ADD CONSTRAINT "venues_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "venues" ADD CONSTRAINT "venues_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "venues_locales" ADD CONSTRAINT "venues_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_venues_v" ADD CONSTRAINT "_venues_v_parent_id_venues_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_venues_v" ADD CONSTRAINT "_venues_v_version_city_id_cities_id_fk" FOREIGN KEY ("version_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_venues_v" ADD CONSTRAINT "_venues_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_venues_v_locales" ADD CONSTRAINT "_venues_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_venues_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "city_lore" ADD CONSTRAINT "city_lore_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_city_lore_v" ADD CONSTRAINT "_city_lore_v_parent_id_city_lore_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."city_lore"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_city_lore_v" ADD CONSTRAINT "_city_lore_v_version_city_id_cities_id_fk" FOREIGN KEY ("version_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "city_photos" ADD CONSTRAINT "city_photos_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "city_photos" ADD CONSTRAINT "city_photos_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "city_photos_locales" ADD CONSTRAINT "city_photos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."city_photos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "venues_city_idx" ON "venues" USING btree ("city_id");
  CREATE INDEX "venues_kind_idx" ON "venues" USING btree ("kind");
  CREATE INDEX "venues_image_idx" ON "venues" USING btree ("image_id");
  CREATE INDEX "venues_updated_at_idx" ON "venues" USING btree ("updated_at");
  CREATE INDEX "venues_created_at_idx" ON "venues" USING btree ("created_at");
  CREATE INDEX "venues__status_idx" ON "venues" USING btree ("_status");
  CREATE UNIQUE INDEX "venues_locales_locale_parent_id_unique" ON "venues_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "venues_locales_parent_id_idx" ON "venues_locales" USING btree ("_parent_id");
  CREATE INDEX "_venues_v_parent_idx" ON "_venues_v" USING btree ("parent_id");
  CREATE INDEX "_venues_v_version_version_city_idx" ON "_venues_v" USING btree ("version_city_id");
  CREATE INDEX "_venues_v_version_version_kind_idx" ON "_venues_v" USING btree ("version_kind");
  CREATE INDEX "_venues_v_version_version_image_idx" ON "_venues_v" USING btree ("version_image_id");
  CREATE INDEX "_venues_v_version_version_updated_at_idx" ON "_venues_v" USING btree ("version_updated_at");
  CREATE INDEX "_venues_v_version_version_created_at_idx" ON "_venues_v" USING btree ("version_created_at");
  CREATE INDEX "_venues_v_version_version__status_idx" ON "_venues_v" USING btree ("version__status");
  CREATE INDEX "_venues_v_created_at_idx" ON "_venues_v" USING btree ("created_at");
  CREATE INDEX "_venues_v_updated_at_idx" ON "_venues_v" USING btree ("updated_at");
  CREATE INDEX "_venues_v_snapshot_idx" ON "_venues_v" USING btree ("snapshot");
  CREATE INDEX "_venues_v_published_locale_idx" ON "_venues_v" USING btree ("published_locale");
  CREATE INDEX "_venues_v_latest_idx" ON "_venues_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_venues_v_locales_locale_parent_id_unique" ON "_venues_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_venues_v_locales_parent_id_idx" ON "_venues_v_locales" USING btree ("_parent_id");
  CREATE INDEX "city_lore_city_idx" ON "city_lore" USING btree ("city_id");
  CREATE INDEX "city_lore_updated_at_idx" ON "city_lore" USING btree ("updated_at");
  CREATE INDEX "city_lore_created_at_idx" ON "city_lore" USING btree ("created_at");
  CREATE INDEX "city_lore__status_idx" ON "city_lore" USING btree ("_status");
  CREATE INDEX "_city_lore_v_parent_idx" ON "_city_lore_v" USING btree ("parent_id");
  CREATE INDEX "_city_lore_v_version_version_city_idx" ON "_city_lore_v" USING btree ("version_city_id");
  CREATE INDEX "_city_lore_v_version_version_updated_at_idx" ON "_city_lore_v" USING btree ("version_updated_at");
  CREATE INDEX "_city_lore_v_version_version_created_at_idx" ON "_city_lore_v" USING btree ("version_created_at");
  CREATE INDEX "_city_lore_v_version_version__status_idx" ON "_city_lore_v" USING btree ("version__status");
  CREATE INDEX "_city_lore_v_created_at_idx" ON "_city_lore_v" USING btree ("created_at");
  CREATE INDEX "_city_lore_v_updated_at_idx" ON "_city_lore_v" USING btree ("updated_at");
  CREATE INDEX "_city_lore_v_snapshot_idx" ON "_city_lore_v" USING btree ("snapshot");
  CREATE INDEX "_city_lore_v_published_locale_idx" ON "_city_lore_v" USING btree ("published_locale");
  CREATE INDEX "_city_lore_v_latest_idx" ON "_city_lore_v" USING btree ("latest");
  CREATE INDEX "city_photos_city_idx" ON "city_photos" USING btree ("city_id");
  CREATE INDEX "city_photos_photo_idx" ON "city_photos" USING btree ("photo_id");
  CREATE INDEX "city_photos_updated_at_idx" ON "city_photos" USING btree ("updated_at");
  CREATE INDEX "city_photos_created_at_idx" ON "city_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "city_photos_locales_locale_parent_id_unique" ON "city_photos_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "city_photos_locales_parent_id_idx" ON "city_photos_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_venues_fk" FOREIGN KEY ("venues_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_city_lore_fk" FOREIGN KEY ("city_lore_id") REFERENCES "public"."city_lore"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_city_photos_fk" FOREIGN KEY ("city_photos_id") REFERENCES "public"."city_photos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "stories_category_idx" ON "stories" USING btree ("category");
  CREATE INDEX "_stories_v_version_version_category_idx" ON "_stories_v" USING btree ("version_category");
  CREATE INDEX "payload_locked_documents_rels_venues_id_idx" ON "payload_locked_documents_rels" USING btree ("venues_id");
  CREATE INDEX "payload_locked_documents_rels_city_lore_id_idx" ON "payload_locked_documents_rels" USING btree ("city_lore_id");
  CREATE INDEX "payload_locked_documents_rels_city_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("city_photos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "venues" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "venues_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_venues_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_venues_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "city_lore" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_city_lore_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "city_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "city_photos_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "venues" CASCADE;
  DROP TABLE "venues_locales" CASCADE;
  DROP TABLE "_venues_v" CASCADE;
  DROP TABLE "_venues_v_locales" CASCADE;
  DROP TABLE "city_lore" CASCADE;
  DROP TABLE "_city_lore_v" CASCADE;
  DROP TABLE "city_photos" CASCADE;
  DROP TABLE "city_photos_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_venues_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_city_lore_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_city_photos_fk";
  
  DROP INDEX "stories_category_idx";
  DROP INDEX "_stories_v_version_version_category_idx";
  DROP INDEX "payload_locked_documents_rels_venues_id_idx";
  DROP INDEX "payload_locked_documents_rels_city_lore_id_idx";
  DROP INDEX "payload_locked_documents_rels_city_photos_id_idx";
  ALTER TABLE "stays" ALTER COLUMN "ahleen_url" SET NOT NULL;
  ALTER TABLE "stories" DROP COLUMN "category";
  ALTER TABLE "stories" DROP COLUMN "published_at";
  ALTER TABLE "_stories_v" DROP COLUMN "version_category";
  ALTER TABLE "_stories_v" DROP COLUMN "version_published_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "venues_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "city_lore_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "city_photos_id";
  DROP TYPE "public"."enum_stories_category";
  DROP TYPE "public"."enum__stories_v_version_category";
  DROP TYPE "public"."enum_venues_kind";
  DROP TYPE "public"."enum_venues_status";
  DROP TYPE "public"."enum__venues_v_version_kind";
  DROP TYPE "public"."enum__venues_v_version_status";
  DROP TYPE "public"."enum__venues_v_published_locale";
  DROP TYPE "public"."enum_city_lore_kind";
  DROP TYPE "public"."enum_city_lore_status";
  DROP TYPE "public"."enum__city_lore_v_version_kind";
  DROP TYPE "public"."enum__city_lore_v_version_status";
  DROP TYPE "public"."enum__city_lore_v_published_locale";`)
}
