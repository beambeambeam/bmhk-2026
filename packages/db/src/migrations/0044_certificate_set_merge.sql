CREATE TYPE "public"."certificate_set_mode" AS ENUM('REPLACE', 'MERGE');--> statement-breakpoint
ALTER TABLE "certificate_sets" ADD COLUMN "base_set_id" uuid;--> statement-breakpoint
-- Sets uploaded before this migration are full sets.
ALTER TABLE "certificate_sets" ADD COLUMN "mode" "certificate_set_mode" DEFAULT 'REPLACE' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificate_sets" ALTER COLUMN "mode" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "certificate_sets" ADD COLUMN "uploaded_count" integer;--> statement-breakpoint
UPDATE "certificate_sets" SET "uploaded_count" = "certificate_count";--> statement-breakpoint
ALTER TABLE "certificate_sets" ALTER COLUMN "uploaded_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "certificate_sets" ADD CONSTRAINT "certificate_sets_uploaded_count_positive" CHECK ("certificate_sets"."uploaded_count" > 0);--> statement-breakpoint
ALTER TABLE "certificate_sets" ADD CONSTRAINT "certificate_sets_base_set_when_merge" CHECK (("certificate_sets"."mode" = 'MERGE') = ("certificate_sets"."base_set_id" IS NOT NULL));
