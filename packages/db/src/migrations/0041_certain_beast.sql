ALTER TABLE "discord" DROP CONSTRAINT "discord_alt_acc_user_id_unique";--> statement-breakpoint
ALTER TABLE "discord" DROP CONSTRAINT "discord_main_alt_differ";--> statement-breakpoint
ALTER TABLE "discord" DROP COLUMN "alt_acc_user_id";--> statement-breakpoint
ALTER TABLE "discord" DROP COLUMN "alt_redeemed_at";