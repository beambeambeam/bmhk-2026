import type { DrainContext } from "evlog";
import { describe, expect, it, vi } from "vitest";

import { createAuditEventDrain } from "../infrastructure/audit-events";
import type { AuditEventWriter } from "../infrastructure/audit-events";

const auditEvent = {
  audit: {
    action: "legal-consent.updated",
    actor: { id: "user-1", type: "user" },
    changes: {
      after: { privacyPolicyAccepted: false },
      before: { privacyPolicyAccepted: true },
    },
    context: {
      ip: "203.0.113.10",
      requestId: "request-1",
      userAgent: "test-agent",
    },
    idempotencyKey: "audit-key-1",
    outcome: "success",
    target: { id: "consent-1", teamId: "team-1", type: "legal-consent" },
    version: 1,
  },
  environment: "test",
  level: "info",
  service: "bmhk-2026-server",
  timestamp: "2026-08-11T12:00:00.000Z",
} satisfies DrainContext["event"];

describe("audit event drain", () => {
  it("stores an audit event as a queryable record", async () => {
    const write = vi.fn<AuditEventWriter["write"]>();
    const drain = createAuditEventDrain({ write });

    await drain({
      event: auditEvent,
      request: { method: "PATCH", path: "/rpc/teamConsents/update", requestId: "request-1" },
    });

    expect(write).toHaveBeenCalledWith({
      action: "legal-consent.updated",
      actorId: "user-1",
      actorType: "user",
      causationId: null,
      changes: {
        after: { privacyPolicyAccepted: false },
        before: { privacyPolicyAccepted: true },
      },
      context: {
        ip: "203.0.113.10",
        requestId: "request-1",
        userAgent: "test-agent",
      },
      correlationId: null,
      idempotencyKey: "audit-key-1",
      occurredAt: new Date("2026-08-11T12:00:00.000Z"),
      outcome: "success",
      reason: null,
      signature: null,
      target: { id: "consent-1", teamId: "team-1", type: "legal-consent" },
      targetId: "consent-1",
      targetType: "legal-consent",
      teamId: "team-1",
      version: 1,
    });
  });

  it("ignores an event without an audit record", async () => {
    const write = vi.fn<AuditEventWriter["write"]>();
    const drain = createAuditEventDrain({ write });

    await drain({
      event: {
        environment: "test",
        level: "info",
        service: "bmhk-2026-server",
        timestamp: "2026-08-11T12:00:00.000Z",
      },
    });

    expect(write).not.toHaveBeenCalled();
  });
});
