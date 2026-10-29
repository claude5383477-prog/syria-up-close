import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_guides_languages" AS ENUM('ar', 'en', 'fr', 'de', 'tr', 'ru', 'es', 'it', 'fa', 'ku');
  CREATE TYPE "public"."enum_guides_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__guides_v_version_languages" AS ENUM('ar', 'en', 'fr', 'de', 'tr', 'ru', 'es', 'it', 'fa', 'ku');
  CREATE TYPE "public"."enum__guides_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__guides_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_bookings_status" AS ENUM('new', 'confirmed', 'cancelled', 'done');
  CREATE TYPE "public"."enum_bookings_language" AS ENUM('ar', 'en', 'fr', 'de', 'tr', 'ru', 'es', 'it', 'fa', 'ku');
  CREATE TYPE "public"."enum_videos_platform" AS ENUM('youtube', 'instagram', 'tiktok');
  CREATE TYPE "public"."enum_videos_orientation" AS ENUM('wide', 'tall');
  CREATE TYPE "public"."enum_videos_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__videos_v_version_platform" AS ENUM('youtube', 'instagram', 'tiktok');
  CREATE TYPE "public"."enum__videos_v_version_orientation" AS ENUM('wide', 'tall');
  CREATE TYPE "public"."enum__videos_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__videos_v_published_locale" AS ENUM('ar', 'en');
  CREATE TABLE "guides_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_guides_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "guides_trips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "guides_trips_locales" (
  	"title" varchar,
  	"duration" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "guides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"photo_id" integer,
  	"city_id" integer,
  	"verified_at" timestamp(3) with time zone,
  	"contact_email" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_guides_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "guides_locales" (
  	"name" varchar,
  	"area" varchar,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "guides_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "_guides_v_version_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__guides_v_version_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_guides_v_version_trips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_guides_v_version_trips_locales" (
  	"title" varchar,
  	"duration" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_guides_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_photo_id" integer,
  	"version_city_id" integer,
  	"version_verified_at" timestamp(3) with time zone,
  	"version_contact_email" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__guides_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__guides_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_guides_v_locales" (
  	"version_name" varchar,
  	"version_area" varchar,
  	"version_bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_guides_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"status" "enum_bookings_status" DEFAULT 'new' NOT NULL,
  	"guide_id" integer NOT NULL,
  	"trip" varchar NOT NULL,
  	"date" varchar NOT NULL,
  	"people" numeric NOT NULL,
  	"language" "enum_bookings_language" NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar,
  	"email" varchar NOT NULL,
  	"note" varchar,
  	"consent" boolean DEFAULT false NOT NULL,
  	"internal_note" varchar,
  	"client_key" varchar,
  	"reminded_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "videos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"platform" "enum_videos_platform",
  	"video_id" varchar,
  	"orientation" "enum_videos_orientation",
  	"author" varchar,
  	"city_id" integer,
  	"duration" varchar,
  	"thumbnail_id" integer,
  	"published_on" timestamp(3) with time zone,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_videos_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "videos_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_videos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_url" varchar,
  	"version_platform" "enum__videos_v_version_platform",
  	"version_video_id" varchar,
  	"version_orientation" "enum__videos_v_version_orientation",
  	"version_author" varchar,
  	"version_city_id" integer,
  	"version_duration" varchar,
  	"version_thumbnail_id" integer,
  	"version_published_on" timestamp(3) with time zone,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__videos_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__videos_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_videos_v_locales" (
  	"version_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "notification_settings_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL
  );
  
  CREATE TABLE "notification_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"on_new" boolean DEFAULT true,
  	"daily_digest" boolean DEFAULT false,
  	"reminder24h" boolean DEFAULT true,
  	"copy_to_guide" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "guides_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "bookings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "videos_id" integer;
  ALTER TABLE "guides_languages" ADD CONSTRAINT "guides_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guides_trips" ADD CONSTRAINT "guides_trips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guides_trips_locales" ADD CONSTRAINT "guides_trips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guides_trips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guides" ADD CONSTRAINT "guides_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guides" ADD CONSTRAINT "guides_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "guides_locales" ADD CONSTRAINT "guides_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "guides_texts" ADD CONSTRAINT "guides_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v_version_languages" ADD CONSTRAINT "_guides_v_version_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v_version_trips" ADD CONSTRAINT "_guides_v_version_trips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v_version_trips_locales" ADD CONSTRAINT "_guides_v_version_trips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guides_v_version_trips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_parent_id_guides_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v" ADD CONSTRAINT "_guides_v_version_city_id_cities_id_fk" FOREIGN KEY ("version_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_guides_v_locales" ADD CONSTRAINT "_guides_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_guides_v_texts" ADD CONSTRAINT "_guides_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "videos" ADD CONSTRAINT "videos_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "videos" ADD CONSTRAINT "videos_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "videos_locales" ADD CONSTRAINT "videos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_videos_v" ADD CONSTRAINT "_videos_v_parent_id_videos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_videos_v" ADD CONSTRAINT "_videos_v_version_city_id_cities_id_fk" FOREIGN KEY ("version_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_videos_v" ADD CONSTRAINT "_videos_v_version_thumbnail_id_media_id_fk" FOREIGN KEY ("version_thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_videos_v_locales" ADD CONSTRAINT "_videos_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_videos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "notification_settings_emails" ADD CONSTRAINT "notification_settings_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."notification_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "guides_languages_order_idx" ON "guides_languages" USING btree ("order");
  CREATE INDEX "guides_languages_parent_idx" ON "guides_languages" USING btree ("parent_id");
  CREATE INDEX "guides_trips_order_idx" ON "guides_trips" USING btree ("_order");
  CREATE INDEX "guides_trips_parent_id_idx" ON "guides_trips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "guides_trips_locales_locale_parent_id_unique" ON "guides_trips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "guides_trips_locales_parent_id_idx" ON "guides_trips_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "guides_slug_idx" ON "guides" USING btree ("slug");
  CREATE INDEX "guides_photo_idx" ON "guides" USING btree ("photo_id");
  CREATE INDEX "guides_city_idx" ON "guides" USING btree ("city_id");
  CREATE INDEX "guides_updated_at_idx" ON "guides" USING btree ("updated_at");
  CREATE INDEX "guides_created_at_idx" ON "guides" USING btree ("created_at");
  CREATE INDEX "guides__status_idx" ON "guides" USING btree ("_status");
  CREATE UNIQUE INDEX "guides_locales_locale_parent_id_unique" ON "guides_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "guides_locales_parent_id_idx" ON "guides_locales" USING btree ("_parent_id");
  CREATE INDEX "guides_texts_order_parent" ON "guides_texts" USING btree ("order","parent_id");
  CREATE INDEX "guides_texts_locale_parent" ON "guides_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_guides_v_version_languages_order_idx" ON "_guides_v_version_languages" USING btree ("order");
  CREATE INDEX "_guides_v_version_languages_parent_idx" ON "_guides_v_version_languages" USING btree ("parent_id");
  CREATE INDEX "_guides_v_version_trips_order_idx" ON "_guides_v_version_trips" USING btree ("_order");
  CREATE INDEX "_guides_v_version_trips_parent_id_idx" ON "_guides_v_version_trips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_guides_v_version_trips_locales_locale_parent_id_unique" ON "_guides_v_version_trips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_guides_v_version_trips_locales_parent_id_idx" ON "_guides_v_version_trips_locales" USING btree ("_parent_id");
  CREATE INDEX "_guides_v_parent_idx" ON "_guides_v" USING btree ("parent_id");
  CREATE INDEX "_guides_v_version_version_slug_idx" ON "_guides_v" USING btree ("version_slug");
  CREATE INDEX "_guides_v_version_version_photo_idx" ON "_guides_v" USING btree ("version_photo_id");
  CREATE INDEX "_guides_v_version_version_city_idx" ON "_guides_v" USING btree ("version_city_id");
  CREATE INDEX "_guides_v_version_version_updated_at_idx" ON "_guides_v" USING btree ("version_updated_at");
  CREATE INDEX "_guides_v_version_version_created_at_idx" ON "_guides_v" USING btree ("version_created_at");
  CREATE INDEX "_guides_v_version_version__status_idx" ON "_guides_v" USING btree ("version__status");
  CREATE INDEX "_guides_v_created_at_idx" ON "_guides_v" USING btree ("created_at");
  CREATE INDEX "_guides_v_updated_at_idx" ON "_guides_v" USING btree ("updated_at");
  CREATE INDEX "_guides_v_snapshot_idx" ON "_guides_v" USING btree ("snapshot");
  CREATE INDEX "_guides_v_published_locale_idx" ON "_guides_v" USING btree ("published_locale");
  CREATE INDEX "_guides_v_latest_idx" ON "_guides_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_guides_v_locales_locale_parent_id_unique" ON "_guides_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_guides_v_locales_parent_id_idx" ON "_guides_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_guides_v_texts_order_parent" ON "_guides_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_guides_v_texts_locale_parent" ON "_guides_v_texts" USING btree ("locale","parent_id");
  CREATE UNIQUE INDEX "bookings_code_idx" ON "bookings" USING btree ("code");
  CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");
  CREATE INDEX "bookings_guide_idx" ON "bookings" USING btree ("guide_id");
  CREATE INDEX "bookings_client_key_idx" ON "bookings" USING btree ("client_key");
  CREATE INDEX "bookings_updated_at_idx" ON "bookings" USING btree ("updated_at");
  CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");
  CREATE INDEX "videos_city_idx" ON "videos" USING btree ("city_id");
  CREATE INDEX "videos_thumbnail_idx" ON "videos" USING btree ("thumbnail_id");
  CREATE INDEX "videos_updated_at_idx" ON "videos" USING btree ("updated_at");
  CREATE INDEX "videos_created_at_idx" ON "videos" USING btree ("created_at");
  CREATE INDEX "videos__status_idx" ON "videos" USING btree ("_status");
  CREATE UNIQUE INDEX "videos_locales_locale_parent_id_unique" ON "videos_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "videos_locales_parent_id_idx" ON "videos_locales" USING btree ("_parent_id");
  CREATE INDEX "_videos_v_parent_idx" ON "_videos_v" USING btree ("parent_id");
  CREATE INDEX "_videos_v_version_version_city_idx" ON "_videos_v" USING btree ("version_city_id");
  CREATE INDEX "_videos_v_version_version_thumbnail_idx" ON "_videos_v" USING btree ("version_thumbnail_id");
  CREATE INDEX "_videos_v_version_version_updated_at_idx" ON "_videos_v" USING btree ("version_updated_at");
  CREATE INDEX "_videos_v_version_version_created_at_idx" ON "_videos_v" USING btree ("version_created_at");
  CREATE INDEX "_videos_v_version_version__status_idx" ON "_videos_v" USING btree ("version__status");
  CREATE INDEX "_videos_v_created_at_idx" ON "_videos_v" USING btree ("created_at");
  CREATE INDEX "_videos_v_updated_at_idx" ON "_videos_v" USING btree ("updated_at");
  CREATE INDEX "_videos_v_snapshot_idx" ON "_videos_v" USING btree ("snapshot");
  CREATE INDEX "_videos_v_published_locale_idx" ON "_videos_v" USING btree ("published_locale");
  CREATE INDEX "_videos_v_latest_idx" ON "_videos_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_videos_v_locales_locale_parent_id_unique" ON "_videos_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_videos_v_locales_parent_id_idx" ON "_videos_v_locales" USING btree ("_parent_id");
  CREATE INDEX "notification_settings_emails_order_idx" ON "notification_settings_emails" USING btree ("_order");
  CREATE INDEX "notification_settings_emails_parent_id_idx" ON "notification_settings_emails" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_guides_fk" FOREIGN KEY ("guides_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bookings_fk" FOREIGN KEY ("bookings_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_videos_fk" FOREIGN KEY ("videos_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_guides_id_idx" ON "payload_locked_documents_rels" USING btree ("guides_id");
  CREATE INDEX "payload_locked_documents_rels_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("bookings_id");
  CREATE INDEX "payload_locked_documents_rels_videos_id_idx" ON "payload_locked_documents_rels" USING btree ("videos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "guides_languages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "guides_trips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "guides_trips_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "guides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "guides_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "guides_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_guides_v_version_languages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_guides_v_version_trips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_guides_v_version_trips_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_guides_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_guides_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_guides_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bookings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "videos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "videos_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_videos_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_videos_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "notification_settings_emails" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "notification_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "guides_languages" CASCADE;
  DROP TABLE "guides_trips" CASCADE;
  DROP TABLE "guides_trips_locales" CASCADE;
  DROP TABLE "guides" CASCADE;
  DROP TABLE "guides_locales" CASCADE;
  DROP TABLE "guides_texts" CASCADE;
  DROP TABLE "_guides_v_version_languages" CASCADE;
  DROP TABLE "_guides_v_version_trips" CASCADE;
  DROP TABLE "_guides_v_version_trips_locales" CASCADE;
  DROP TABLE "_guides_v" CASCADE;
  DROP TABLE "_guides_v_locales" CASCADE;
  DROP TABLE "_guides_v_texts" CASCADE;
  DROP TABLE "bookings" CASCADE;
  DROP TABLE "videos" CASCADE;
  DROP TABLE "videos_locales" CASCADE;
  DROP TABLE "_videos_v" CASCADE;
  DROP TABLE "_videos_v_locales" CASCADE;
  DROP TABLE "notification_settings_emails" CASCADE;
  DROP TABLE "notification_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_guides_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_bookings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_videos_fk";
  
  DROP INDEX "payload_locked_documents_rels_guides_id_idx";
  DROP INDEX "payload_locked_documents_rels_bookings_id_idx";
  DROP INDEX "payload_locked_documents_rels_videos_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "guides_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "bookings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "videos_id";
  DROP TYPE "public"."enum_guides_languages";
  DROP TYPE "public"."enum_guides_status";
  DROP TYPE "public"."enum__guides_v_version_languages";
  DROP TYPE "public"."enum__guides_v_version_status";
  DROP TYPE "public"."enum__guides_v_published_locale";
  DROP TYPE "public"."enum_bookings_status";
  DROP TYPE "public"."enum_bookings_language";
  DROP TYPE "public"."enum_videos_platform";
  DROP TYPE "public"."enum_videos_orientation";
  DROP TYPE "public"."enum_videos_status";
  DROP TYPE "public"."enum__videos_v_version_platform";
  DROP TYPE "public"."enum__videos_v_version_orientation";
  DROP TYPE "public"."enum__videos_v_version_status";
  DROP TYPE "public"."enum__videos_v_published_locale";`)
}
