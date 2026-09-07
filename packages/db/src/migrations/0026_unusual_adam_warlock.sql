CREATE TYPE "public"."check_in_round" AS ENUM('ROUND_1', 'ROUND_2');--> statement-breakpoint
ALTER TYPE "public"."team_award" ADD VALUE 'NOT_QUALIFIED' BEFORE 'ROUND_1_COMPLETED';--> statement-breakpoint
ALTER TABLE "staff_check_ins" ADD COLUMN "round" "check_in_round" DEFAULT 'ROUND_1' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_check_ins" DROP CONSTRAINT "staff_check_ins_pkey";--> statement-breakpoint
ALTER TABLE "staff_check_ins" ADD CONSTRAINT "staff_check_ins_user_id_round_pk" PRIMARY KEY("user_id","round");--> statement-breakpoint
ALTER TABLE "staff_check_ins" ALTER COLUMN "round" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "participant_check_ins" ADD COLUMN "round" "check_in_round" DEFAULT 'ROUND_1' NOT NULL;--> statement-breakpoint
ALTER TABLE "participant_check_ins" DROP CONSTRAINT "participant_check_ins_pkey";--> statement-breakpoint
ALTER TABLE "participant_check_ins" ADD CONSTRAINT "participant_check_ins_participant_id_round_pk" PRIMARY KEY("participant_id","round");--> statement-breakpoint
ALTER TABLE "participant_check_ins" ALTER COLUMN "round" DROP DEFAULT;
