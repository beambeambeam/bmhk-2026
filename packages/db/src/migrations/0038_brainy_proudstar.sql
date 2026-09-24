CREATE TABLE "team_check_ins" (
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_in_by_user_id" text NOT NULL,
	"round" "check_in_round" NOT NULL,
	"team_id" uuid NOT NULL,
	CONSTRAINT "team_check_ins_team_id_round_pk" PRIMARY KEY("team_id","round")
);
--> statement-breakpoint
ALTER TABLE "team_check_ins" ADD CONSTRAINT "team_check_ins_checked_in_by_user_id_user_id_fk" FOREIGN KEY ("checked_in_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_check_ins" ADD CONSTRAINT "team_check_ins_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_check_ins_checked_in_by_user_id_idx" ON "team_check_ins" USING btree ("checked_in_by_user_id");