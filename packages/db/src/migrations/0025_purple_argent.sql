ALTER TABLE "team_participants" ADD COLUMN "nickname_en" text;--> statement-breakpoint
ALTER TABLE "team_participants" ADD COLUMN "nickname_th" text;--> statement-breakpoint
UPDATE "team_participants"
SET
	"nickname_en" = "first_name_en",
	"nickname_th" = "first_name_th";--> statement-breakpoint
ALTER TABLE "team_participants" ALTER COLUMN "nickname_en" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_participants" ALTER COLUMN "nickname_th" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_participants" ADD CONSTRAINT "team_participants_nickname_en_valid" CHECK (btrim("team_participants"."nickname_en") = "team_participants"."nickname_en" AND length("team_participants"."nickname_en") BETWEEN 1 AND 100);--> statement-breakpoint
ALTER TABLE "team_participants" ADD CONSTRAINT "team_participants_nickname_th_valid" CHECK (btrim("team_participants"."nickname_th") = "team_participants"."nickname_th" AND length("team_participants"."nickname_th") BETWEEN 1 AND 100);
