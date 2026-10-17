import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'correspondent');
  CREATE TYPE "public"."enum_status_items_type" AS ENUM('electricity', 'internet', 'roads', 'weather', 'events');
  CREATE TYPE "public"."enum__status_items_v_version_type" AS ENUM('electricity', 'internet', 'roads', 'weather', 'events');
  CREATE TYPE "public"."enum_first_visit_pages_topic" AS ENUM('visa', 'arrival', 'money', 'connectivity', 'transport');
  CREATE TYPE "public"."enum_first_visit_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__first_visit_pages_v_version_topic" AS ENUM('visa', 'arrival', 'money', 'connectivity', 'transport');
  CREATE TYPE "public"."enum__first_visit_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__first_visit_pages_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_season_reports_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__season_reports_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__season_reports_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_stories_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__stories_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__stories_v_published_locale" AS ENUM('ar', 'en');
  CREATE TYPE "public"."enum_audit_log_operation" AS ENUM('create', 'update', 'delete', 'confirm');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'correspondent' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cities_id" integer
  );
  
  CREATE TABLE "cities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"cover_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cities_locales" (
  	"name" varchar NOT NULL,
  	"tag" varchar,
  	"lede" varchar,
  	"eat" varchar,
  	"cover_shot_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "places" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"city_id" integer NOT NULL,
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "places_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "day_trips" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from_city_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "status_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"city_id" integer NOT NULL,
  	"type" "enum_status_items_type" NOT NULL,
  	"source_url" varchar,
  	"verified_by_id" integer,
  	"verified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "status_items_locales" (
  	"value" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_status_items_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_city_id" integer NOT NULL,
  	"version_type" "enum__status_items_v_version_type" NOT NULL,
  	"version_source_url" varchar,
  	"version_verified_by_id" integer,
  	"version_verified_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_status_items_v_locales" (
  	"version_value" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "first_visit_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"topic" "enum_first_visit_pages_topic",
  	"official_source_url" varchar,
  	"last_verified_at" timestamp(3) with time zone,
  	"last_verified_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_first_visit_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "first_visit_pages_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_first_visit_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_topic" "enum__first_visit_pages_v_version_topic",
  	"version_official_source_url" varchar,
  	"version_last_verified_at" timestamp(3) with time zone,
  	"version_last_verified_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__first_visit_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__first_visit_pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_first_visit_pages_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "season_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"city_id" integer,
  	"field_date" timestamp(3) with time zone,
  	"body" jsonb,
  	"author_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_season_reports_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "season_reports_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_season_reports_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_city_id" integer,
  	"version_field_date" timestamp(3) with time zone,
  	"version_body" jsonb,
  	"version_author_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__season_reports_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__season_reports_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_season_reports_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "stories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"city_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_stories_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "stories_locales" (
  	"title" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "stories_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "stories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_stories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_city_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__stories_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__stories_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_stories_v_locales" (
  	"version_title" varchar,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_stories_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_stories_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "daily_detail" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"photo_id" integer,
  	"city_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "daily_detail_locales" (
  	"sentence" varchar NOT NULL,
  	"place" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "stays" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"city_id" integer NOT NULL,
  	"image_id" integer,
  	"ahleen_url" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stays_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"credit" varchar,
  	"shot_date" timestamp(3) with time zone,
  	"uploaded_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"user_id" integer,
  	"operation" "enum_audit_log_operation" NOT NULL,
  	"collection" varchar NOT NULL,
  	"doc_id" varchar NOT NULL,
  	"changed_fields" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"cities_id" integer,
  	"places_id" integer,
  	"day_trips_id" integer,
  	"status_items_id" integer,
  	"first_visit_pages_id" integer,
  	"season_reports_id" integer,
  	"stories_id" integer,
  	"daily_detail_id" integer,
  	"stays_id" integer,
  	"media_id" integer,
  	"audit_log_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ahleen_base_url" varchar DEFAULT 'https://ahleenbooking.com' NOT NULL,
  	"partner_link_rel" varchar DEFAULT 'sponsored noopener' NOT NULL,
  	"staleness_status_days" numeric DEFAULT 7 NOT NULL,
  	"staleness_first_visit_days" numeric DEFAULT 30 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"disclosure_text" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cities" ADD CONSTRAINT "cities_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cities_locales" ADD CONSTRAINT "cities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "places" ADD CONSTRAINT "places_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "places" ADD CONSTRAINT "places_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "places_locales" ADD CONSTRAINT "places_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "day_trips" ADD CONSTRAINT "day_trips_from_city_id_cities_id_fk" FOREIGN KEY ("from_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "status_items" ADD CONSTRAINT "status_items_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "status_items" ADD CONSTRAINT "status_items_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "status_items_locales" ADD CONSTRAINT "status_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."status_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_status_items_v" ADD CONSTRAINT "_status_items_v_parent_id_status_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."status_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_status_items_v" ADD CONSTRAINT "_status_items_v_version_city_id_cities_id_fk" FOREIGN KEY ("version_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_status_items_v" ADD CONSTRAINT "_status_items_v_version_verified_by_id_users_id_fk" FOREIGN KEY ("version_verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_status_items_v_locales" ADD CONSTRAINT "_status_items_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_status_items_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "first_visit_pages" ADD CONSTRAINT "first_visit_pages_last_verified_by_id_users_id_fk" FOREIGN KEY ("last_verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "first_visit_pages_locales" ADD CONSTRAINT "first_visit_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."first_visit_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_first_visit_pages_v" ADD CONSTRAINT "_first_visit_pages_v_parent_id_first_visit_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."first_visit_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_first_visit_pages_v" ADD CONSTRAINT "_first_visit_pages_v_version_last_verified_by_id_users_id_fk" FOREIGN KEY ("version_last_verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_first_visit_pages_v_locales" ADD CONSTRAINT "_first_visit_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_first_visit_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "season_reports" ADD CONSTRAINT "season_reports_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "season_reports" ADD CONSTRAINT "season_reports_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "season_reports_rels" ADD CONSTRAINT "season_reports_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."season_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "season_reports_rels" ADD CONSTRAINT "season_reports_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_season_reports_v" ADD CONSTRAINT "_season_reports_v_parent_id_season_reports_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."season_reports"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_season_reports_v" ADD CONSTRAINT "_season_reports_v_version_city_id_cities_id_fk" FOREIGN KEY ("version_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_season_reports_v" ADD CONSTRAINT "_season_reports_v_version_author_id_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_season_reports_v_rels" ADD CONSTRAINT "_season_reports_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_season_reports_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_season_reports_v_rels" ADD CONSTRAINT "_season_reports_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories" ADD CONSTRAINT "stories_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stories_locales" ADD CONSTRAINT "stories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_texts" ADD CONSTRAINT "stories_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_rels" ADD CONSTRAINT "stories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_rels" ADD CONSTRAINT "stories_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_parent_id_stories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_version_city_id_cities_id_fk" FOREIGN KEY ("version_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stories_v_locales" ADD CONSTRAINT "_stories_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_texts" ADD CONSTRAINT "_stories_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_rels" ADD CONSTRAINT "_stories_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_rels" ADD CONSTRAINT "_stories_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "daily_detail" ADD CONSTRAINT "daily_detail_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "daily_detail" ADD CONSTRAINT "daily_detail_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "daily_detail_locales" ADD CONSTRAINT "daily_detail_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."daily_detail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stays" ADD CONSTRAINT "stays_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stays" ADD CONSTRAINT "stays_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stays_locales" ADD CONSTRAINT "stays_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_places_fk" FOREIGN KEY ("places_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_day_trips_fk" FOREIGN KEY ("day_trips_id") REFERENCES "public"."day_trips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_status_items_fk" FOREIGN KEY ("status_items_id") REFERENCES "public"."status_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_first_visit_pages_fk" FOREIGN KEY ("first_visit_pages_id") REFERENCES "public"."first_visit_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_season_reports_fk" FOREIGN KEY ("season_reports_id") REFERENCES "public"."season_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stories_fk" FOREIGN KEY ("stories_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_daily_detail_fk" FOREIGN KEY ("daily_detail_id") REFERENCES "public"."daily_detail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stays_fk" FOREIGN KEY ("stays_id") REFERENCES "public"."stays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_cities_id_idx" ON "users_rels" USING btree ("cities_id");
  CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");
  CREATE INDEX "cities_cover_image_idx" ON "cities" USING btree ("cover_image_id");
  CREATE INDEX "cities_updated_at_idx" ON "cities" USING btree ("updated_at");
  CREATE INDEX "cities_created_at_idx" ON "cities" USING btree ("created_at");
  CREATE UNIQUE INDEX "cities_locales_locale_parent_id_unique" ON "cities_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cities_locales_parent_id_idx" ON "cities_locales" USING btree ("_parent_id");
  CREATE INDEX "places_city_idx" ON "places" USING btree ("city_id");
  CREATE INDEX "places_image_idx" ON "places" USING btree ("image_id");
  CREATE INDEX "places_updated_at_idx" ON "places" USING btree ("updated_at");
  CREATE INDEX "places_created_at_idx" ON "places" USING btree ("created_at");
  CREATE UNIQUE INDEX "places_locales_locale_parent_id_unique" ON "places_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "places_locales_parent_id_idx" ON "places_locales" USING btree ("_parent_id");
  CREATE INDEX "day_trips_from_city_idx" ON "day_trips" USING btree ("from_city_id");
  CREATE INDEX "day_trips_updated_at_idx" ON "day_trips" USING btree ("updated_at");
  CREATE INDEX "day_trips_created_at_idx" ON "day_trips" USING btree ("created_at");
  CREATE INDEX "status_items_city_idx" ON "status_items" USING btree ("city_id");
  CREATE INDEX "status_items_verified_by_idx" ON "status_items" USING btree ("verified_by_id");
  CREATE INDEX "status_items_verified_at_idx" ON "status_items" USING btree ("verified_at");
  CREATE INDEX "status_items_updated_at_idx" ON "status_items" USING btree ("updated_at");
  CREATE INDEX "status_items_created_at_idx" ON "status_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "city_type_idx" ON "status_items" USING btree ("city_id","type");
  CREATE UNIQUE INDEX "status_items_locales_locale_parent_id_unique" ON "status_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "status_items_locales_parent_id_idx" ON "status_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_status_items_v_parent_idx" ON "_status_items_v" USING btree ("parent_id");
  CREATE INDEX "_status_items_v_version_version_city_idx" ON "_status_items_v" USING btree ("version_city_id");
  CREATE INDEX "_status_items_v_version_version_verified_by_idx" ON "_status_items_v" USING btree ("version_verified_by_id");
  CREATE INDEX "_status_items_v_version_version_verified_at_idx" ON "_status_items_v" USING btree ("version_verified_at");
  CREATE INDEX "_status_items_v_version_version_updated_at_idx" ON "_status_items_v" USING btree ("version_updated_at");
  CREATE INDEX "_status_items_v_version_version_created_at_idx" ON "_status_items_v" USING btree ("version_created_at");
  CREATE INDEX "_status_items_v_created_at_idx" ON "_status_items_v" USING btree ("created_at");
  CREATE INDEX "_status_items_v_updated_at_idx" ON "_status_items_v" USING btree ("updated_at");
  CREATE INDEX "version_city_version_type_idx" ON "_status_items_v" USING btree ("version_city_id","version_type");
  CREATE UNIQUE INDEX "_status_items_v_locales_locale_parent_id_unique" ON "_status_items_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_status_items_v_locales_parent_id_idx" ON "_status_items_v_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "first_visit_pages_topic_idx" ON "first_visit_pages" USING btree ("topic");
  CREATE INDEX "first_visit_pages_last_verified_by_idx" ON "first_visit_pages" USING btree ("last_verified_by_id");
  CREATE INDEX "first_visit_pages_updated_at_idx" ON "first_visit_pages" USING btree ("updated_at");
  CREATE INDEX "first_visit_pages_created_at_idx" ON "first_visit_pages" USING btree ("created_at");
  CREATE INDEX "first_visit_pages__status_idx" ON "first_visit_pages" USING btree ("_status");
  CREATE UNIQUE INDEX "first_visit_pages_locales_locale_parent_id_unique" ON "first_visit_pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "first_visit_pages_locales_parent_id_idx" ON "first_visit_pages_locales" USING btree ("_parent_id");
  CREATE INDEX "_first_visit_pages_v_parent_idx" ON "_first_visit_pages_v" USING btree ("parent_id");
  CREATE INDEX "_first_visit_pages_v_version_version_topic_idx" ON "_first_visit_pages_v" USING btree ("version_topic");
  CREATE INDEX "_first_visit_pages_v_version_version_last_verified_by_idx" ON "_first_visit_pages_v" USING btree ("version_last_verified_by_id");
  CREATE INDEX "_first_visit_pages_v_version_version_updated_at_idx" ON "_first_visit_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_first_visit_pages_v_version_version_created_at_idx" ON "_first_visit_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_first_visit_pages_v_version_version__status_idx" ON "_first_visit_pages_v" USING btree ("version__status");
  CREATE INDEX "_first_visit_pages_v_created_at_idx" ON "_first_visit_pages_v" USING btree ("created_at");
  CREATE INDEX "_first_visit_pages_v_updated_at_idx" ON "_first_visit_pages_v" USING btree ("updated_at");
  CREATE INDEX "_first_visit_pages_v_snapshot_idx" ON "_first_visit_pages_v" USING btree ("snapshot");
  CREATE INDEX "_first_visit_pages_v_published_locale_idx" ON "_first_visit_pages_v" USING btree ("published_locale");
  CREATE INDEX "_first_visit_pages_v_latest_idx" ON "_first_visit_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_first_visit_pages_v_locales_locale_parent_id_unique" ON "_first_visit_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_first_visit_pages_v_locales_parent_id_idx" ON "_first_visit_pages_v_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "season_reports_slug_idx" ON "season_reports" USING btree ("slug");
  CREATE INDEX "season_reports_city_idx" ON "season_reports" USING btree ("city_id");
  CREATE INDEX "season_reports_author_idx" ON "season_reports" USING btree ("author_id");
  CREATE INDEX "season_reports_updated_at_idx" ON "season_reports" USING btree ("updated_at");
  CREATE INDEX "season_reports_created_at_idx" ON "season_reports" USING btree ("created_at");
  CREATE INDEX "season_reports__status_idx" ON "season_reports" USING btree ("_status");
  CREATE INDEX "season_reports_rels_order_idx" ON "season_reports_rels" USING btree ("order");
  CREATE INDEX "season_reports_rels_parent_idx" ON "season_reports_rels" USING btree ("parent_id");
  CREATE INDEX "season_reports_rels_path_idx" ON "season_reports_rels" USING btree ("path");
  CREATE INDEX "season_reports_rels_media_id_idx" ON "season_reports_rels" USING btree ("media_id");
  CREATE INDEX "_season_reports_v_parent_idx" ON "_season_reports_v" USING btree ("parent_id");
  CREATE INDEX "_season_reports_v_version_version_slug_idx" ON "_season_reports_v" USING btree ("version_slug");
  CREATE INDEX "_season_reports_v_version_version_city_idx" ON "_season_reports_v" USING btree ("version_city_id");
  CREATE INDEX "_season_reports_v_version_version_author_idx" ON "_season_reports_v" USING btree ("version_author_id");
  CREATE INDEX "_season_reports_v_version_version_updated_at_idx" ON "_season_reports_v" USING btree ("version_updated_at");
  CREATE INDEX "_season_reports_v_version_version_created_at_idx" ON "_season_reports_v" USING btree ("version_created_at");
  CREATE INDEX "_season_reports_v_version_version__status_idx" ON "_season_reports_v" USING btree ("version__status");
  CREATE INDEX "_season_reports_v_created_at_idx" ON "_season_reports_v" USING btree ("created_at");
  CREATE INDEX "_season_reports_v_updated_at_idx" ON "_season_reports_v" USING btree ("updated_at");
  CREATE INDEX "_season_reports_v_snapshot_idx" ON "_season_reports_v" USING btree ("snapshot");
  CREATE INDEX "_season_reports_v_published_locale_idx" ON "_season_reports_v" USING btree ("published_locale");
  CREATE INDEX "_season_reports_v_latest_idx" ON "_season_reports_v" USING btree ("latest");
  CREATE INDEX "_season_reports_v_rels_order_idx" ON "_season_reports_v_rels" USING btree ("order");
  CREATE INDEX "_season_reports_v_rels_parent_idx" ON "_season_reports_v_rels" USING btree ("parent_id");
  CREATE INDEX "_season_reports_v_rels_path_idx" ON "_season_reports_v_rels" USING btree ("path");
  CREATE INDEX "_season_reports_v_rels_media_id_idx" ON "_season_reports_v_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "stories_slug_idx" ON "stories" USING btree ("slug");
  CREATE INDEX "stories_city_idx" ON "stories" USING btree ("city_id");
  CREATE INDEX "stories_updated_at_idx" ON "stories" USING btree ("updated_at");
  CREATE INDEX "stories_created_at_idx" ON "stories" USING btree ("created_at");
  CREATE INDEX "stories__status_idx" ON "stories" USING btree ("_status");
  CREATE UNIQUE INDEX "stories_locales_locale_parent_id_unique" ON "stories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "stories_locales_parent_id_idx" ON "stories_locales" USING btree ("_parent_id");
  CREATE INDEX "stories_texts_order_parent" ON "stories_texts" USING btree ("order","parent_id");
  CREATE INDEX "stories_rels_order_idx" ON "stories_rels" USING btree ("order");
  CREATE INDEX "stories_rels_parent_idx" ON "stories_rels" USING btree ("parent_id");
  CREATE INDEX "stories_rels_path_idx" ON "stories_rels" USING btree ("path");
  CREATE INDEX "stories_rels_media_id_idx" ON "stories_rels" USING btree ("media_id");
  CREATE INDEX "_stories_v_parent_idx" ON "_stories_v" USING btree ("parent_id");
  CREATE INDEX "_stories_v_version_version_slug_idx" ON "_stories_v" USING btree ("version_slug");
  CREATE INDEX "_stories_v_version_version_city_idx" ON "_stories_v" USING btree ("version_city_id");
  CREATE INDEX "_stories_v_version_version_updated_at_idx" ON "_stories_v" USING btree ("version_updated_at");
  CREATE INDEX "_stories_v_version_version_created_at_idx" ON "_stories_v" USING btree ("version_created_at");
  CREATE INDEX "_stories_v_version_version__status_idx" ON "_stories_v" USING btree ("version__status");
  CREATE INDEX "_stories_v_created_at_idx" ON "_stories_v" USING btree ("created_at");
  CREATE INDEX "_stories_v_updated_at_idx" ON "_stories_v" USING btree ("updated_at");
  CREATE INDEX "_stories_v_snapshot_idx" ON "_stories_v" USING btree ("snapshot");
  CREATE INDEX "_stories_v_published_locale_idx" ON "_stories_v" USING btree ("published_locale");
  CREATE INDEX "_stories_v_latest_idx" ON "_stories_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_stories_v_locales_locale_parent_id_unique" ON "_stories_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_stories_v_locales_parent_id_idx" ON "_stories_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_texts_order_parent" ON "_stories_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_stories_v_rels_order_idx" ON "_stories_v_rels" USING btree ("order");
  CREATE INDEX "_stories_v_rels_parent_idx" ON "_stories_v_rels" USING btree ("parent_id");
  CREATE INDEX "_stories_v_rels_path_idx" ON "_stories_v_rels" USING btree ("path");
  CREATE INDEX "_stories_v_rels_media_id_idx" ON "_stories_v_rels" USING btree ("media_id");
  CREATE UNIQUE INDEX "daily_detail_date_idx" ON "daily_detail" USING btree ("date");
  CREATE INDEX "daily_detail_photo_idx" ON "daily_detail" USING btree ("photo_id");
  CREATE INDEX "daily_detail_city_idx" ON "daily_detail" USING btree ("city_id");
  CREATE INDEX "daily_detail_updated_at_idx" ON "daily_detail" USING btree ("updated_at");
  CREATE INDEX "daily_detail_created_at_idx" ON "daily_detail" USING btree ("created_at");
  CREATE UNIQUE INDEX "daily_detail_locales_locale_parent_id_unique" ON "daily_detail_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "daily_detail_locales_parent_id_idx" ON "daily_detail_locales" USING btree ("_parent_id");
  CREATE INDEX "stays_city_idx" ON "stays" USING btree ("city_id");
  CREATE INDEX "stays_image_idx" ON "stays" USING btree ("image_id");
  CREATE INDEX "stays_updated_at_idx" ON "stays" USING btree ("updated_at");
  CREATE INDEX "stays_created_at_idx" ON "stays" USING btree ("created_at");
  CREATE UNIQUE INDEX "stays_locales_locale_parent_id_unique" ON "stays_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "stays_locales_parent_id_idx" ON "stays_locales" USING btree ("_parent_id");
  CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_locales_parent_id_idx" ON "media_locales" USING btree ("_parent_id");
  CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");
  CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");
  CREATE INDEX "audit_log_collection_idx" ON "audit_log" USING btree ("collection");
  CREATE INDEX "audit_log_doc_id_idx" ON "audit_log" USING btree ("doc_id");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_cities_id_idx" ON "payload_locked_documents_rels" USING btree ("cities_id");
  CREATE INDEX "payload_locked_documents_rels_places_id_idx" ON "payload_locked_documents_rels" USING btree ("places_id");
  CREATE INDEX "payload_locked_documents_rels_day_trips_id_idx" ON "payload_locked_documents_rels" USING btree ("day_trips_id");
  CREATE INDEX "payload_locked_documents_rels_status_items_id_idx" ON "payload_locked_documents_rels" USING btree ("status_items_id");
  CREATE INDEX "payload_locked_documents_rels_first_visit_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("first_visit_pages_id");
  CREATE INDEX "payload_locked_documents_rels_season_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("season_reports_id");
  CREATE INDEX "payload_locked_documents_rels_stories_id_idx" ON "payload_locked_documents_rels" USING btree ("stories_id");
  CREATE INDEX "payload_locked_documents_rels_daily_detail_id_idx" ON "payload_locked_documents_rels" USING btree ("daily_detail_id");
  CREATE INDEX "payload_locked_documents_rels_stays_id_idx" ON "payload_locked_documents_rels" USING btree ("stays_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_log_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_locales_parent_id_idx" ON "site_settings_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "cities" CASCADE;
  DROP TABLE "cities_locales" CASCADE;
  DROP TABLE "places" CASCADE;
  DROP TABLE "places_locales" CASCADE;
  DROP TABLE "day_trips" CASCADE;
  DROP TABLE "status_items" CASCADE;
  DROP TABLE "status_items_locales" CASCADE;
  DROP TABLE "_status_items_v" CASCADE;
  DROP TABLE "_status_items_v_locales" CASCADE;
  DROP TABLE "first_visit_pages" CASCADE;
  DROP TABLE "first_visit_pages_locales" CASCADE;
  DROP TABLE "_first_visit_pages_v" CASCADE;
  DROP TABLE "_first_visit_pages_v_locales" CASCADE;
  DROP TABLE "season_reports" CASCADE;
  DROP TABLE "season_reports_rels" CASCADE;
  DROP TABLE "_season_reports_v" CASCADE;
  DROP TABLE "_season_reports_v_rels" CASCADE;
  DROP TABLE "stories" CASCADE;
  DROP TABLE "stories_locales" CASCADE;
  DROP TABLE "stories_texts" CASCADE;
  DROP TABLE "stories_rels" CASCADE;
  DROP TABLE "_stories_v" CASCADE;
  DROP TABLE "_stories_v_locales" CASCADE;
  DROP TABLE "_stories_v_texts" CASCADE;
  DROP TABLE "_stories_v_rels" CASCADE;
  DROP TABLE "daily_detail" CASCADE;
  DROP TABLE "daily_detail_locales" CASCADE;
  DROP TABLE "stays" CASCADE;
  DROP TABLE "stays_locales" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_status_items_type";
  DROP TYPE "public"."enum__status_items_v_version_type";
  DROP TYPE "public"."enum_first_visit_pages_topic";
  DROP TYPE "public"."enum_first_visit_pages_status";
  DROP TYPE "public"."enum__first_visit_pages_v_version_topic";
  DROP TYPE "public"."enum__first_visit_pages_v_version_status";
  DROP TYPE "public"."enum__first_visit_pages_v_published_locale";
  DROP TYPE "public"."enum_season_reports_status";
  DROP TYPE "public"."enum__season_reports_v_version_status";
  DROP TYPE "public"."enum__season_reports_v_published_locale";
  DROP TYPE "public"."enum_stories_status";
  DROP TYPE "public"."enum__stories_v_version_status";
  DROP TYPE "public"."enum__stories_v_published_locale";
  DROP TYPE "public"."enum_audit_log_operation";`)
}
