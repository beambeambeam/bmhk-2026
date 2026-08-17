CREATE TYPE "public"."participant_check_in_flag" AS ENUM('feeling_unwell', 'bad_behavior');--> statement-breakpoint
CREATE TABLE "participant_check_ins" (
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_in_by_user_id" text NOT NULL,
	"flag" "participant_check_in_flag",
	"participant_id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant_check_ins" ADD CONSTRAINT "participant_check_ins_checked_in_by_user_id_user_id_fk" FOREIGN KEY ("checked_in_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_check_ins" ADD CONSTRAINT "participant_check_ins_participant_id_team_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."team_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participant_check_ins_checked_in_by_user_id_idx" ON "participant_check_ins" USING btree ("checked_in_by_user_id");