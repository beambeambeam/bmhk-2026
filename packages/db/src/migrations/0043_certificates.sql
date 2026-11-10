CREATE TYPE "public"."certificate_recipient_role" AS ENUM('PARTICIPANT', 'ADVISOR');--> statement-breakpoint
CREATE TYPE "public"."certificate_set_status" AS ENUM('UPLOADING', 'ACTIVE');--> statement-breakpoint
CREATE TYPE "public"."certificate_template" AS ENUM('first', 'second', 'third', 'honorable-mention', 'semi-final', 'final', 'participate', 'appreciation');--> statement-breakpoint
CREATE TABLE "certificate_sets" (
	"activated_at" timestamp with time zone,
	"certificate_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"source_name" text NOT NULL,
	"source_size_bytes" bigint NOT NULL,
	"status" "certificate_set_status" NOT NULL,
	"uploaded_by" text,
	CONSTRAINT "certificate_sets_source_name_nonempty" CHECK (length(trim("certificate_sets"."source_name")) > 0),
	CONSTRAINT "certificate_sets_certificate_count_positive" CHECK ("certificate_sets"."certificate_count" > 0),
	CONSTRAINT "certificate_sets_activated_when_active" CHECK (("certificate_sets"."status" = 'ACTIVE') = ("certificate_sets"."activated_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"award" "team_award" NOT NULL,
	"bucket" text NOT NULL,
	"full_name" text NOT NULL,
	"full_name_en" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_index" integer,
	"object_key" text NOT NULL,
	"person_id" uuid NOT NULL,
	"role" "certificate_recipient_role" NOT NULL,
	"set_id" uuid NOT NULL,
	"size_bytes" bigint,
	"stored_at" timestamp with time zone,
	"team_code" text NOT NULL,
	"team_id" uuid NOT NULL,
	"team_name" text NOT NULL,
	"template" "certificate_template" NOT NULL,
	"zip_path" text NOT NULL,
	CONSTRAINT "certificates_set_recipient_unique" UNIQUE("set_id","role","person_id","team_id"),
	CONSTRAINT "certificates_set_zip_path_unique" UNIQUE("set_id","zip_path"),
	CONSTRAINT "certificates_bucket_object_key_unique" UNIQUE("bucket","object_key"),
	CONSTRAINT "certificates_award_eligible" CHECK ("certificates"."award" IN ('ROUND_1_PARTICIPATED', 'ADVANCED_TO_ROUND_2', 'ROUND_2_PARTICIPATED', 'ADVANCED_TO_ROUND_3', 'ROUND_3_PARTICIPATED', 'HONORABLE_MENTION', 'THIRD_PLACE', 'SECOND_PLACE', 'FIRST_PLACE')),
	CONSTRAINT "certificates_stored_together" CHECK (("certificates"."stored_at" IS NULL) = ("certificates"."size_bytes" IS NULL)),
	CONSTRAINT "certificates_size_bytes_positive" CHECK ("certificates"."size_bytes" IS NULL OR "certificates"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "certificate_sets" ADD CONSTRAINT "certificate_sets_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_set_id_certificate_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."certificate_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_sets_single_active_idx" ON "certificate_sets" USING btree ("status") WHERE "certificate_sets"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "certificates_person_team_role_idx" ON "certificates" USING btree ("person_id","team_id","role");