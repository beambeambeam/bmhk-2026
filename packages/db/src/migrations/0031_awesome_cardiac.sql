CREATE TABLE "staff_discord_links" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discord_user_id" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "staff_discord_links_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "staff_discord_links_discord_user_id_unique" UNIQUE("discord_user_id")
);
--> statement-breakpoint
CREATE TABLE "staff_overseer_import_backlog" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"group_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_verify_tokens" (
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discord_user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	CONSTRAINT "staff_verify_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "staff_discord_links" ADD CONSTRAINT "staff_discord_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_overseer_import_backlog" ADD CONSTRAINT "staff_overseer_import_backlog_group_id_discord_team_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."discord_team_groups"("id") ON DELETE cascade ON UPDATE no action;