ALTER TABLE "team_registration_reviews" ADD COLUMN "advisor_notes" text;--> statement-breakpoint
ALTER TABLE "team_registration_reviews" ADD COLUMN "advisor_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_registration_reviews" ADD COLUMN "participant1_notes" text;--> statement-breakpoint
ALTER TABLE "team_registration_reviews" ADD COLUMN "participant1_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_registration_reviews" ADD COLUMN "participant2_notes" text;--> statement-breakpoint
ALTER TABLE "team_registration_reviews" ADD COLUMN "participant2_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_registration_reviews" ADD COLUMN "participant3_notes" text;--> statement-breakpoint
ALTER TABLE "team_registration_reviews" ADD COLUMN "participant3_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_registration_reviews" ADD CONSTRAINT "team_registration_reviews_subject_notes_valid" CHECK (
        ("team_registration_reviews"."advisor_notes" IS NULL OR
          (btrim("team_registration_reviews"."advisor_notes") = "team_registration_reviews"."advisor_notes" AND
            length("team_registration_reviews"."advisor_notes") BETWEEN 1 AND 4000)) AND
        ("team_registration_reviews"."participant1_notes" IS NULL OR
          (btrim("team_registration_reviews"."participant1_notes") = "team_registration_reviews"."participant1_notes" AND
            length("team_registration_reviews"."participant1_notes") BETWEEN 1 AND 4000)) AND
        ("team_registration_reviews"."participant2_notes" IS NULL OR
          (btrim("team_registration_reviews"."participant2_notes") = "team_registration_reviews"."participant2_notes" AND
            length("team_registration_reviews"."participant2_notes") BETWEEN 1 AND 4000)) AND
        ("team_registration_reviews"."participant3_notes" IS NULL OR
          (btrim("team_registration_reviews"."participant3_notes") = "team_registration_reviews"."participant3_notes" AND
            length("team_registration_reviews"."participant3_notes") BETWEEN 1 AND 4000))
      );