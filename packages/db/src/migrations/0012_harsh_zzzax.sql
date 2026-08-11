CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'system', 'api', 'agent');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('success', 'failure', 'denied');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"action" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"causation_id" text,
	"changes" jsonb,
	"context" jsonb,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"outcome" "audit_outcome" NOT NULL,
	"reason" text,
	"signature" text,
	"target" jsonb,
	"target_id" text,
	"target_type" text,
	"team_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "audit_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE INDEX "audit_events_action_occurred_at_idx" ON "audit_events" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_occurred_at_idx" ON "audit_events" USING btree ("actor_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_target_occurred_at_idx" ON "audit_events" USING btree ("target_type","target_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_team_occurred_at_idx" ON "audit_events" USING btree ("team_id","occurred_at");