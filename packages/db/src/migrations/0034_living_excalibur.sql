CREATE TYPE "public"."first_round_eligibility" AS ENUM('PENDING', 'ELIGIBLE', 'NOT_ELIGIBLE');--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "first_round_eligibility" "first_round_eligibility" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
UPDATE "teams"
SET "first_round_eligibility" = CASE
  WHEN "award" IN (
    'REGISTRATION_COMPLETED',
    'ROUND_1_COMPLETED',
    'ROUND_2_COMPLETED',
    'HONORABLE_MENTION',
    'THIRD_PLACE',
    'SECOND_PLACE',
    'FIRST_PLACE'
  ) THEN 'ELIGIBLE'::"first_round_eligibility"
  WHEN "award" = 'NOT_QUALIFIED' THEN 'NOT_ELIGIBLE'::"first_round_eligibility"
  ELSE 'PENDING'::"first_round_eligibility"
END;--> statement-breakpoint
UPDATE "teams"
SET "award" = 'NO_ACHIEVEMENT'
WHERE "award" = 'REGISTRATION_COMPLETED';
