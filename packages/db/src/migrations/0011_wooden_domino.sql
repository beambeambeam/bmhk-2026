CREATE TABLE "team_consents" (
	"codern_terms_accepted" boolean DEFAULT false NOT NULL,
	"competition_rules_accepted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"guardian_consent_obtained" boolean DEFAULT false NOT NULL,
	"health_data_consent" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"privacy_policy_accepted" boolean DEFAULT false NOT NULL,
	"publicity_media_consent" boolean DEFAULT false NOT NULL,
	"team_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_consents_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
ALTER TABLE "team_consents" ADD CONSTRAINT "team_consents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
