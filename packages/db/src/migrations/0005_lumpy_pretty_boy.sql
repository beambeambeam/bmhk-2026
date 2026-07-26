DROP INDEX "teams_user_id_idx";--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_user_id_unique" UNIQUE("user_id");