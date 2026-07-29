CREATE TABLE "team_participants" (
	"academic_record_document_file_id" uuid,
	"chronic_conditions_and_first_aid_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"date_of_birth" date NOT NULL,
	"dietary_requirements" text,
	"drug_allergies" text,
	"email" text NOT NULL,
	"first_name_en" text NOT NULL,
	"first_name_th" text NOT NULL,
	"food_allergies" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_document_file_id" uuid,
	"index" integer NOT NULL,
	"last_name_en" text NOT NULL,
	"last_name_th" text NOT NULL,
	"line_id" text,
	"middle_name_en" text,
	"middle_name_th" text,
	"phone" text NOT NULL,
	"portrait_photo_file_id" uuid,
	"team_id" uuid NOT NULL,
	"title_en" text NOT NULL,
	"title_th" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_participants_team_id_index_unique" UNIQUE("team_id","index"),
	CONSTRAINT "team_participants_document_files_distinct" CHECK (
        "team_participants"."portrait_photo_file_id" IS NULL OR "team_participants"."identity_document_file_id" IS NULL OR
        "team_participants"."portrait_photo_file_id" <> "team_participants"."identity_document_file_id"
      ),
	CONSTRAINT "team_participants_identity_academic_files_distinct" CHECK (
        "team_participants"."identity_document_file_id" IS NULL OR "team_participants"."academic_record_document_file_id" IS NULL OR
        "team_participants"."identity_document_file_id" <> "team_participants"."academic_record_document_file_id"
      ),
	CONSTRAINT "team_participants_portrait_academic_files_distinct" CHECK (
        "team_participants"."portrait_photo_file_id" IS NULL OR "team_participants"."academic_record_document_file_id" IS NULL OR
        "team_participants"."portrait_photo_file_id" <> "team_participants"."academic_record_document_file_id"
      ),
	CONSTRAINT "team_participants_index_valid" CHECK ("team_participants"."index" BETWEEN 1 AND 3),
	CONSTRAINT "team_participants_date_of_birth_valid" CHECK ("team_participants"."date_of_birth" <= CURRENT_DATE),
	CONSTRAINT "team_participants_title_th_valid" CHECK (btrim("team_participants"."title_th") = "team_participants"."title_th" AND length("team_participants"."title_th") BETWEEN 1 AND 50),
	CONSTRAINT "team_participants_first_name_th_valid" CHECK (btrim("team_participants"."first_name_th") = "team_participants"."first_name_th" AND length("team_participants"."first_name_th") BETWEEN 1 AND 100),
	CONSTRAINT "team_participants_middle_name_th_valid" CHECK ("team_participants"."middle_name_th" IS NULL OR (btrim("team_participants"."middle_name_th") = "team_participants"."middle_name_th" AND length("team_participants"."middle_name_th") BETWEEN 1 AND 100)),
	CONSTRAINT "team_participants_last_name_th_valid" CHECK (btrim("team_participants"."last_name_th") = "team_participants"."last_name_th" AND length("team_participants"."last_name_th") BETWEEN 1 AND 100),
	CONSTRAINT "team_participants_title_en_valid" CHECK (btrim("team_participants"."title_en") = "team_participants"."title_en" AND length("team_participants"."title_en") BETWEEN 1 AND 50),
	CONSTRAINT "team_participants_first_name_en_valid" CHECK (btrim("team_participants"."first_name_en") = "team_participants"."first_name_en" AND length("team_participants"."first_name_en") BETWEEN 1 AND 100),
	CONSTRAINT "team_participants_middle_name_en_valid" CHECK ("team_participants"."middle_name_en" IS NULL OR (btrim("team_participants"."middle_name_en") = "team_participants"."middle_name_en" AND length("team_participants"."middle_name_en") BETWEEN 1 AND 100)),
	CONSTRAINT "team_participants_last_name_en_valid" CHECK (btrim("team_participants"."last_name_en") = "team_participants"."last_name_en" AND length("team_participants"."last_name_en") BETWEEN 1 AND 100),
	CONSTRAINT "team_participants_food_allergies_valid" CHECK ("team_participants"."food_allergies" IS NULL OR (btrim("team_participants"."food_allergies") = "team_participants"."food_allergies" AND length("team_participants"."food_allergies") BETWEEN 1 AND 1000)),
	CONSTRAINT "team_participants_dietary_requirements_valid" CHECK ("team_participants"."dietary_requirements" IS NULL OR (btrim("team_participants"."dietary_requirements") = "team_participants"."dietary_requirements" AND length("team_participants"."dietary_requirements") BETWEEN 1 AND 1000)),
	CONSTRAINT "team_participants_drug_allergies_valid" CHECK ("team_participants"."drug_allergies" IS NULL OR (btrim("team_participants"."drug_allergies") = "team_participants"."drug_allergies" AND length("team_participants"."drug_allergies") BETWEEN 1 AND 1000)),
	CONSTRAINT "team_participants_chronic_conditions_and_first_aid_notes_valid" CHECK ("team_participants"."chronic_conditions_and_first_aid_notes" IS NULL OR (btrim("team_participants"."chronic_conditions_and_first_aid_notes") = "team_participants"."chronic_conditions_and_first_aid_notes" AND length("team_participants"."chronic_conditions_and_first_aid_notes") BETWEEN 1 AND 2000)),
	CONSTRAINT "team_participants_email_valid" CHECK (btrim("team_participants"."email") = "team_participants"."email" AND length("team_participants"."email") BETWEEN 1 AND 254),
	CONSTRAINT "team_participants_phone_valid" CHECK (btrim("team_participants"."phone") = "team_participants"."phone" AND length("team_participants"."phone") BETWEEN 1 AND 32),
	CONSTRAINT "team_participants_line_id_valid" CHECK ("team_participants"."line_id" IS NULL OR (btrim("team_participants"."line_id") = "team_participants"."line_id" AND length("team_participants"."line_id") BETWEEN 1 AND 100))
);
--> statement-breakpoint
ALTER TABLE "team_participants" ADD CONSTRAINT "team_participants_academic_record_document_file_id_files_id_fk" FOREIGN KEY ("academic_record_document_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_participants" ADD CONSTRAINT "team_participants_identity_document_file_id_files_id_fk" FOREIGN KEY ("identity_document_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_participants" ADD CONSTRAINT "team_participants_portrait_photo_file_id_files_id_fk" FOREIGN KEY ("portrait_photo_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_participants" ADD CONSTRAINT "team_participants_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_participants_academic_record_document_file_id_idx" ON "team_participants" USING btree ("academic_record_document_file_id");--> statement-breakpoint
CREATE INDEX "team_participants_identity_document_file_id_idx" ON "team_participants" USING btree ("identity_document_file_id");--> statement-breakpoint
CREATE INDEX "team_participants_portrait_photo_file_id_idx" ON "team_participants" USING btree ("portrait_photo_file_id");