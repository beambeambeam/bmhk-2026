CREATE TABLE "team_advisors" (
	"chronic_conditions_and_first_aid_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dietary_requirements" text,
	"drug_allergies" text,
	"email" text NOT NULL,
	"first_name_en" text NOT NULL,
	"first_name_th" text NOT NULL,
	"food_allergies" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_document_file_id" uuid NOT NULL,
	"last_name_en" text NOT NULL,
	"last_name_th" text NOT NULL,
	"line_id" text,
	"middle_name_en" text,
	"middle_name_th" text,
	"phone" text NOT NULL,
	"teacher_status_document_file_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"title_en" text NOT NULL,
	"title_th" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_advisors_team_id_unique" UNIQUE("team_id"),
	CONSTRAINT "team_advisors_document_files_distinct" CHECK ("team_advisors"."identity_document_file_id" <> "team_advisors"."teacher_status_document_file_id"),
	CONSTRAINT "team_advisors_title_th_valid" CHECK (btrim("team_advisors"."title_th") = "team_advisors"."title_th" AND length("team_advisors"."title_th") BETWEEN 1 AND 50),
	CONSTRAINT "team_advisors_first_name_th_valid" CHECK (btrim("team_advisors"."first_name_th") = "team_advisors"."first_name_th" AND length("team_advisors"."first_name_th") BETWEEN 1 AND 100),
	CONSTRAINT "team_advisors_middle_name_th_valid" CHECK ("team_advisors"."middle_name_th" IS NULL OR (btrim("team_advisors"."middle_name_th") = "team_advisors"."middle_name_th" AND length("team_advisors"."middle_name_th") BETWEEN 1 AND 100)),
	CONSTRAINT "team_advisors_last_name_th_valid" CHECK (btrim("team_advisors"."last_name_th") = "team_advisors"."last_name_th" AND length("team_advisors"."last_name_th") BETWEEN 1 AND 100),
	CONSTRAINT "team_advisors_title_en_valid" CHECK (btrim("team_advisors"."title_en") = "team_advisors"."title_en" AND length("team_advisors"."title_en") BETWEEN 1 AND 50),
	CONSTRAINT "team_advisors_first_name_en_valid" CHECK (btrim("team_advisors"."first_name_en") = "team_advisors"."first_name_en" AND length("team_advisors"."first_name_en") BETWEEN 1 AND 100),
	CONSTRAINT "team_advisors_middle_name_en_valid" CHECK ("team_advisors"."middle_name_en" IS NULL OR (btrim("team_advisors"."middle_name_en") = "team_advisors"."middle_name_en" AND length("team_advisors"."middle_name_en") BETWEEN 1 AND 100)),
	CONSTRAINT "team_advisors_last_name_en_valid" CHECK (btrim("team_advisors"."last_name_en") = "team_advisors"."last_name_en" AND length("team_advisors"."last_name_en") BETWEEN 1 AND 100),
	CONSTRAINT "team_advisors_food_allergies_valid" CHECK ("team_advisors"."food_allergies" IS NULL OR (btrim("team_advisors"."food_allergies") = "team_advisors"."food_allergies" AND length("team_advisors"."food_allergies") BETWEEN 1 AND 1000)),
	CONSTRAINT "team_advisors_dietary_requirements_valid" CHECK ("team_advisors"."dietary_requirements" IS NULL OR (btrim("team_advisors"."dietary_requirements") = "team_advisors"."dietary_requirements" AND length("team_advisors"."dietary_requirements") BETWEEN 1 AND 1000)),
	CONSTRAINT "team_advisors_drug_allergies_valid" CHECK ("team_advisors"."drug_allergies" IS NULL OR (btrim("team_advisors"."drug_allergies") = "team_advisors"."drug_allergies" AND length("team_advisors"."drug_allergies") BETWEEN 1 AND 1000)),
	CONSTRAINT "team_advisors_chronic_conditions_and_first_aid_notes_valid" CHECK ("team_advisors"."chronic_conditions_and_first_aid_notes" IS NULL OR (btrim("team_advisors"."chronic_conditions_and_first_aid_notes") = "team_advisors"."chronic_conditions_and_first_aid_notes" AND length("team_advisors"."chronic_conditions_and_first_aid_notes") BETWEEN 1 AND 2000)),
	CONSTRAINT "team_advisors_email_valid" CHECK (btrim("team_advisors"."email") = "team_advisors"."email" AND length("team_advisors"."email") BETWEEN 1 AND 254),
	CONSTRAINT "team_advisors_phone_valid" CHECK (btrim("team_advisors"."phone") = "team_advisors"."phone" AND length("team_advisors"."phone") BETWEEN 1 AND 32),
	CONSTRAINT "team_advisors_line_id_valid" CHECK ("team_advisors"."line_id" IS NULL OR (btrim("team_advisors"."line_id") = "team_advisors"."line_id" AND length("team_advisors"."line_id") BETWEEN 1 AND 100))
);
--> statement-breakpoint
ALTER TABLE "team_advisors" ADD CONSTRAINT "team_advisors_identity_document_file_id_files_id_fk" FOREIGN KEY ("identity_document_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_advisors" ADD CONSTRAINT "team_advisors_teacher_status_document_file_id_files_id_fk" FOREIGN KEY ("teacher_status_document_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_advisors" ADD CONSTRAINT "team_advisors_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_advisors_identity_document_file_id_idx" ON "team_advisors" USING btree ("identity_document_file_id");--> statement-breakpoint
CREATE INDEX "team_advisors_teacher_status_document_file_id_idx" ON "team_advisors" USING btree ("teacher_status_document_file_id");