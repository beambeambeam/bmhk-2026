CREATE TABLE "files" (
	"bucket" text NOT NULL,
	"content_type" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" text NOT NULL,
	"original_name" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_by" text,
	CONSTRAINT "files_bucket_object_key_unique" UNIQUE("bucket","object_key"),
	CONSTRAINT "files_bucket_nonempty" CHECK (length(trim("files"."bucket")) > 0),
	CONSTRAINT "files_object_key_nonempty" CHECK (length(trim("files"."object_key")) > 0),
	CONSTRAINT "files_original_name_nonempty" CHECK (length(trim("files"."original_name")) > 0),
	CONSTRAINT "files_content_type_nonempty" CHECK (length(trim("files"."content_type")) > 0),
	CONSTRAINT "files_size_bytes_nonnegative" CHECK ("files"."size_bytes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_uploaded_by_uploaded_at_idx" ON "files" USING btree ("uploaded_by","uploaded_at");