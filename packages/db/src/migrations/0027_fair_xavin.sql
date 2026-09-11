CREATE TABLE "discord_team_group_members" (
	"group_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	CONSTRAINT "discord_team_group_members_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "discord_team_groups" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discord_team_group_members" ADD CONSTRAINT "discord_team_group_members_group_id_discord_team_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."discord_team_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_team_group_members" ADD CONSTRAINT "discord_team_group_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;