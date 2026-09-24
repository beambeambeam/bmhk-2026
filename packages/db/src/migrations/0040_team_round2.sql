CREATE TABLE "team_round2" (
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"participant1_identity_document_file_id" uuid,
	"participant1_student_id_document_file_id" uuid,
	"participant2_identity_document_file_id" uuid,
	"participant2_student_id_document_file_id" uuid,
	"participant3_identity_document_file_id" uuid,
	"participant3_student_id_document_file_id" uuid,
	"team_id" uuid PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_round2_participant1_files_distinct" CHECK (
        "team_round2"."participant1_identity_document_file_id" IS NULL OR
        "team_round2"."participant1_student_id_document_file_id" IS NULL OR
        "team_round2"."participant1_identity_document_file_id" <> "team_round2"."participant1_student_id_document_file_id"
      ),
	CONSTRAINT "team_round2_participant2_files_distinct" CHECK (
        "team_round2"."participant2_identity_document_file_id" IS NULL OR
        "team_round2"."participant2_student_id_document_file_id" IS NULL OR
        "team_round2"."participant2_identity_document_file_id" <> "team_round2"."participant2_student_id_document_file_id"
      ),
	CONSTRAINT "team_round2_participant3_files_distinct" CHECK (
        "team_round2"."participant3_identity_document_file_id" IS NULL OR
        "team_round2"."participant3_student_id_document_file_id" IS NULL OR
        "team_round2"."participant3_identity_document_file_id" <> "team_round2"."participant3_student_id_document_file_id"
      )
);
--> statement-breakpoint
ALTER TABLE "team_round2" ADD CONSTRAINT "team_round2_participant1_identity_document_file_id_files_id_fk" FOREIGN KEY ("participant1_identity_document_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_round2" ADD CONSTRAINT "team_round2_participant1_student_id_document_file_id_files_id_fk" FOREIGN KEY ("participant1_student_id_document_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_round2" ADD CONSTRAINT "team_round2_participant2_identity_document_file_id_files_id_fk" FOREIGN KEY ("participant2_identity_document_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_round2" ADD CONSTRAINT "team_round2_participant2_student_id_document_file_id_files_id_fk" FOREIGN KEY ("participant2_student_id_document_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_round2" ADD CONSTRAINT "team_round2_participant3_identity_document_file_id_files_id_fk" FOREIGN KEY ("participant3_identity_document_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_round2" ADD CONSTRAINT "team_round2_participant3_student_id_document_file_id_files_id_fk" FOREIGN KEY ("participant3_student_id_document_file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_round2" ADD CONSTRAINT "team_round2_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_round2_participant1_identity_document_file_id_idx" ON "team_round2" USING btree ("participant1_identity_document_file_id");--> statement-breakpoint
CREATE INDEX "team_round2_participant1_student_id_document_file_id_idx" ON "team_round2" USING btree ("participant1_student_id_document_file_id");--> statement-breakpoint
CREATE INDEX "team_round2_participant2_identity_document_file_id_idx" ON "team_round2" USING btree ("participant2_identity_document_file_id");--> statement-breakpoint
CREATE INDEX "team_round2_participant2_student_id_document_file_id_idx" ON "team_round2" USING btree ("participant2_student_id_document_file_id");--> statement-breakpoint
CREATE INDEX "team_round2_participant3_identity_document_file_id_idx" ON "team_round2" USING btree ("participant3_identity_document_file_id");--> statement-breakpoint
CREATE INDEX "team_round2_participant3_student_id_document_file_id_idx" ON "team_round2" USING btree ("participant3_student_id_document_file_id");