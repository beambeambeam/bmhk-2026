import { defineAuditAction } from "evlog";

export const adminAccessDeniedAudit = defineAuditAction("admin.access.denied", {
  description: "A non-administrator attempted an administrator operation",
  severity: "critical",
  target: "admin-operation",
});

export const userRoleChangedAudit = defineAuditAction("user.role.changed", {
  description: "An Administrator changed a user's authorization role",
  requiresChanges: true,
  severity: "critical",
  target: "user",
});

export const userDirectoryAccessedAudit = defineAuditAction("user-directory.accessed", {
  description: "An Administrator accessed the sensitive user directory",
  severity: "critical",
  target: "user-directory",
});

export const staffCheckInCreatedAudit = defineAuditAction("staff-check-in.created", {
  description: "A staff member recorded another staff member's on-site arrival",
  requiresChanges: true,
  severity: "critical",
  target: "staff-check-in",
});

export const staffCheckInCancelledAudit = defineAuditAction("staff-check-in.cancelled", {
  description: "A staff member cancelled another staff member's on-site arrival record",
  severity: "critical",
  target: "staff-check-in",
});

export const participantCheckInCreatedAudit = defineAuditAction("participant-check-in.created", {
  description: "A staff member recorded a participant's on-site arrival",
  requiresChanges: true,
  severity: "critical",
  target: "participant-check-in",
});

export const participantCheckInCancelledAudit = defineAuditAction(
  "participant-check-in.cancelled",
  {
    description: "A staff member cancelled a participant's on-site arrival record",
    severity: "critical",
    target: "participant-check-in",
  },
);

export const participantCheckInFlagChangedAudit = defineAuditAction(
  "participant-check-in.flag.changed",
  {
    description: "A staff member changed a participant check-in flag",
    requiresChanges: true,
    severity: "critical",
    target: "participant-check-in",
  },
);

export const awardChangedAudit = defineAuditAction("team.award.changed", {
  description: "A Registration Operator changed an Award",
  requiresChanges: true,
  severity: "critical",
  target: "team",
});

export const legalConsentCreatedAudit = defineAuditAction("legal-consent.created", {
  description: "A Team Owner created Legal Consent",
  requiresChanges: true,
  severity: "critical",
  target: "legal-consent",
});

export const legalConsentUpdatedAudit = defineAuditAction("legal-consent.updated", {
  description: "A Team Owner changed Legal Consent",
  requiresChanges: true,
  severity: "critical",
  target: "legal-consent",
});

export const legalConsentWithdrawnAudit = defineAuditAction("legal-consent.withdrawn", {
  description: "A Team Owner withdrew previously accepted Legal Consent",
  requiresChanges: true,
  severity: "critical",
  target: "legal-consent",
});

export const registrationDocumentReplacedAudit = defineAuditAction(
  "registration-document.replaced",
  {
    description: "A Registration User replaced a sensitive Registration Document",
    requiresChanges: true,
    severity: "critical",
    target: "registration-document",
  },
);

export const teamDeletedAudit = defineAuditAction("team.deleted", {
  description: "A Team Owner deleted a Team and its Registration Information",
  severity: "critical",
  target: "team",
});

export const teamRegistrationSubmittedAudit = defineAuditAction("team-registration.submitted", {
  description: "A Team Owner submitted a Team Registration",
  requiresChanges: true,
  severity: "critical",
  target: "team-registration",
});

export const teamRegistrationReviewChangedAudit = defineAuditAction(
  "team-registration-review.changed",
  {
    description: "A Registration Operator changed a Team Registration Review",
    requiresChanges: true,
    severity: "critical",
    target: "team-registration-review",
  },
);

export const apiKeyCreatedAudit = defineAuditAction("api-key.created", {
  description: "An Administrator created an API key",
  requiresChanges: true,
  severity: "critical",
  target: "api-key",
});

export const apiKeyRevokedAudit = defineAuditAction("api-key.revoked", {
  description: "An Administrator revoked an API key",
  requiresChanges: true,
  severity: "critical",
  target: "api-key",
});
