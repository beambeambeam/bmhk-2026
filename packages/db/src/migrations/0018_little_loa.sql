CREATE TABLE "discord" (
	"alt_redeemed_at" timestamp with time zone,
	"code" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"redeemed_at" timestamp with time zone,
	CONSTRAINT "discord_participant_id_unique" UNIQUE("participant_id"),
	CONSTRAINT "discord_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "discord" ADD CONSTRAINT "discord_participant_id_team_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."team_participants"("id") ON DELETE cascade ON UPDATE no action;