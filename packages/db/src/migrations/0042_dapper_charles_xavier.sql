CREATE TABLE "team_round_results" (
	"completed_assignment" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_submitted_at" timestamp with time zone,
	"round" "check_in_round" NOT NULL,
	"score" numeric,
	"team_id" uuid NOT NULL,
	"total_submission" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_round_results_team_id_round_pk" PRIMARY KEY("team_id","round"),
	CONSTRAINT "team_round_results_completed_assignment_nonnegative" CHECK ("team_round_results"."completed_assignment" >= 0),
	CONSTRAINT "team_round_results_total_submission_nonnegative" CHECK ("team_round_results"."total_submission" >= 0),
	CONSTRAINT "team_round_results_score_valid" CHECK (
        "team_round_results"."score" IS NULL OR (
          "team_round_results"."score" > '-Infinity'::numeric AND
          "team_round_results"."score" < 'Infinity'::numeric AND
          scale("team_round_results"."score") <= 2
        )
      )
);
--> statement-breakpoint
ALTER TABLE "team_round_results" ADD CONSTRAINT "team_round_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;