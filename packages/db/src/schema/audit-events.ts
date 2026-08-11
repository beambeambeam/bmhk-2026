import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

interface StoredAuditChanges {
  after?: unknown;
  before?: unknown;
  patch?: { op: "add" | "remove" | "replace"; path: string; value?: unknown }[];
}

interface StoredAuditTarget {
  id: string;
  type: string;
  [key: string]: unknown;
}

export const auditActorTypeValues = ["user", "system", "api", "agent"] as const;
export const auditOutcomeValues = ["success", "failure", "denied"] as const;

export const auditActorTypeEnum = pgEnum("audit_actor_type", auditActorTypeValues);
export const auditOutcomeEnum = pgEnum("audit_outcome", auditOutcomeValues);

export const auditEvents = pgTable(
  "audit_events",
  {
    action: text("action").notNull(),
    actorId: text("actor_id").notNull(),
    actorType: auditActorTypeEnum("actor_type").notNull(),
    causationId: text("causation_id"),
    changes: jsonb("changes").$type<StoredAuditChanges>(),
    context: jsonb("context").$type<Record<string, unknown>>(),
    correlationId: text("correlation_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    outcome: auditOutcomeEnum("outcome").notNull(),
    reason: text("reason"),
    signature: text("signature"),
    signatureKeyId: text("signature_key_id"),
    target: jsonb("target").$type<StoredAuditTarget>(),
    targetId: text("target_id"),
    targetType: text("target_type"),
    teamId: text("team_id"),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    unique("audit_events_idempotency_key_unique").on(table.idempotencyKey),
    index("audit_events_action_occurred_at_idx").on(table.action, table.occurredAt),
    index("audit_events_actor_occurred_at_idx").on(table.actorId, table.occurredAt),
    index("audit_events_target_occurred_at_idx").on(
      table.targetType,
      table.targetId,
      table.occurredAt,
    ),
    index("audit_events_team_occurred_at_idx").on(table.teamId, table.occurredAt),
  ],
);

export type NewAuditEvent = typeof auditEvents.$inferInsert;
