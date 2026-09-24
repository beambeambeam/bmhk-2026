ALTER TYPE "public"."team_award" RENAME VALUE 'REGISTRATION_COMPLETED' TO 'REGISTRATION_COMPLETE';--> statement-breakpoint
ALTER TYPE "public"."team_award" RENAME VALUE 'ROUND_1_COMPLETED' TO 'ADVANCED_TO_ROUND_2';--> statement-breakpoint
ALTER TYPE "public"."team_award" RENAME VALUE 'ROUND_2_COMPLETED' TO 'ADVANCED_TO_ROUND_3';--> statement-breakpoint
ALTER TYPE "public"."team_award" ADD VALUE 'ROUND_1_PARTICIPATED' BEFORE 'ADVANCED_TO_ROUND_2';--> statement-breakpoint
ALTER TYPE "public"."team_award" ADD VALUE 'ROUND_2_PARTICIPATED' BEFORE 'ADVANCED_TO_ROUND_3';
