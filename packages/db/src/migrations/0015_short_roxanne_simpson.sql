ALTER TABLE "team_consents" ADD COLUMN "codern_terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_consents" ADD COLUMN "competition_rules_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_consents" ADD COLUMN "guardian_consent_obtained_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_consents" ADD COLUMN "health_data_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_consents" ADD COLUMN "privacy_policy_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_consents" ADD COLUMN "publicity_media_consent_at" timestamp with time zone;--> statement-breakpoint
UPDATE "team_consents"
SET
	"codern_terms_accepted_at" = CASE WHEN "codern_terms_accepted" THEN "signed_at" END,
	"competition_rules_accepted_at" = CASE WHEN "competition_rules_accepted" THEN "signed_at" END,
	"guardian_consent_obtained_at" = CASE WHEN "guardian_consent_obtained" THEN "signed_at" END,
	"health_data_consent_at" = CASE WHEN "health_data_consent" THEN "signed_at" END,
	"privacy_policy_accepted_at" = CASE WHEN "privacy_policy_accepted" THEN "signed_at" END,
	"publicity_media_consent_at" = CASE WHEN "publicity_media_consent" THEN "signed_at" END;--> statement-breakpoint
ALTER TABLE "team_consents" DROP COLUMN "signed_at";
