import { db } from "@bmhk-2026/db";
import { auditEvents } from "@bmhk-2026/db/schema/audit-events";
import type { NewAuditEvent } from "@bmhk-2026/db/schema/audit-events";
import { auditEnricher, auditOnly, auditRedactPreset, signed } from "evlog";
import type { AuditFields, AuditTarget, DrainFn } from "evlog";
import type { EvlogElysiaOptions } from "evlog/elysia";

export interface AuditEventWriter {
  write: (event: NewAuditEvent) => Promise<void>;
}

type Database = typeof db;

export function createAuditEventWriter(database: Database = db): AuditEventWriter {
  return {
    write: async (event) => {
      await database
        .insert(auditEvents)
        .values(event)
        .onConflictDoNothing({ target: auditEvents.idempotencyKey });
    },
  };
}

function getTeamId(target: AuditTarget | undefined): string | null {
  if (!target) {
    return null;
  }
  if (target.type === "team") {
    return target.id;
  }
  return typeof target.teamId === "string" ? target.teamId : null;
}

function toAuditEvent(timestamp: string, audit: AuditFields): NewAuditEvent {
  if (audit.idempotencyKey === undefined || audit.idempotencyKey.length === 0) {
    throw new Error("Audit event idempotency key is required before draining");
  }

  return {
    action: audit.action,
    actorId: audit.actor.id,
    actorType: audit.actor.type,
    causationId: audit.causationId ?? null,
    changes: audit.changes,
    context: audit.context,
    correlationId: audit.correlationId ?? null,
    idempotencyKey: audit.idempotencyKey,
    occurredAt: new Date(timestamp),
    outcome: audit.outcome,
    reason: audit.reason ?? null,
    signature: audit.signature ?? null,
    signatureKeyId: null,
    target: audit.target,
    targetId: audit.target?.id ?? null,
    targetType: audit.target?.type ?? null,
    teamId: getTeamId(audit.target),
    version: audit.version ?? 1,
  };
}

function createAuditWriteDrain(writer: AuditEventWriter, signatureKeyId: string | null): DrainFn {
  return async ({ event }) => {
    if (!event.audit) {
      return;
    }
    await writer.write({
      ...toAuditEvent(event.timestamp, event.audit),
      signatureKeyId,
    });
  };
}

export function createAuditEventDrain(writer: AuditEventWriter): DrainFn {
  return auditOnly(createAuditWriteDrain(writer, null), { await: true });
}

export interface AuditObservabilityOptions {
  hmacKeyId: string;
  hmacSecret: string;
  writer: AuditEventWriter;
}

export function createAuditObservabilityOptions({
  hmacKeyId,
  hmacSecret,
  writer,
}: AuditObservabilityOptions): EvlogElysiaOptions {
  const signedDrain = signed(createAuditWriteDrain(writer, hmacKeyId), {
    secret: hmacSecret,
    strategy: "hmac",
  });

  return {
    drain: auditOnly(signedDrain, { await: true }),
    enrich: auditEnricher(),
    redact: {
      ...auditRedactPreset,
      paths: [...(auditRedactPreset.paths ?? [])],
    },
  };
}
