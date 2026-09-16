CREATE TABLE "discord_team_group_overseers" (
	"group_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "discord_team_group_overseers_group_id_unique" UNIQUE("group_id")
);
--> statement-breakpoint
ALTER TABLE "discord_team_group_overseers" ADD CONSTRAINT "discord_team_group_overseers_group_id_discord_team_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."discord_team_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_team_group_overseers" ADD CONSTRAINT "discord_team_group_overseers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;