CREATE TYPE "public"."team_registration_review_status" AS ENUM('PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED');--> statement-breakpoint
CREATE TABLE "team_registration_reviews" (
	"advisor_issue_codes" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_notes" text,
	"participant1_issue_codes" text[] DEFAULT '{}' NOT NULL,
	"participant2_issue_codes" text[] DEFAULT '{}' NOT NULL,
	"participant3_issue_codes" text[] DEFAULT '{}' NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"reviewed_by_user_id" text,
	"status" "team_registration_review_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"team_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_registration_reviews_team_id_unique" UNIQUE("team_id"),
	CONSTRAINT "team_registration_reviews_issue_counts_valid" CHECK (
        cardinality("team_registration_reviews"."advisor_issue_codes") <= 50 AND
        cardinality("team_registration_reviews"."participant1_issue_codes") <= 50 AND
        cardinality("team_registration_reviews"."participant2_issue_codes") <= 50 AND
        cardinality("team_registration_reviews"."participant3_issue_codes") <= 50
      ),
	CONSTRAINT "team_registration_reviews_internal_notes_valid" CHECK (
        "team_registration_reviews"."internal_notes" IS NULL OR
        (btrim("team_registration_reviews"."internal_notes") = "team_registration_reviews"."internal_notes" AND
          length("team_registration_reviews"."internal_notes") BETWEEN 1 AND 4000)
      ),
	CONSTRAINT "team_registration_reviews_status_issues_consistent" CHECK (
        "team_registration_reviews"."status" = 'PENDING_REVIEW' OR
        ("team_registration_reviews"."status" = 'APPROVED' AND
          cardinality("team_registration_reviews"."advisor_issue_codes") = 0 AND
          cardinality("team_registration_reviews"."participant1_issue_codes") = 0 AND
          cardinality("team_registration_reviews"."participant2_issue_codes") = 0 AND
          cardinality("team_registration_reviews"."participant3_issue_codes") = 0) OR
        ("team_registration_reviews"."status" = 'CHANGES_REQUESTED' AND
          cardinality("team_registration_reviews"."advisor_issue_codes") +
          cardinality("team_registration_reviews"."participant1_issue_codes") +
          cardinality("team_registration_reviews"."participant2_issue_codes") +
          cardinality("team_registration_reviews"."participant3_issue_codes") > 0)
      )
);
--> statement-breakpoint
ALTER TABLE "team_registration_reviews" ADD CONSTRAINT "team_registration_reviews_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_registration_reviews" ADD CONSTRAINT "team_registration_reviews_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
