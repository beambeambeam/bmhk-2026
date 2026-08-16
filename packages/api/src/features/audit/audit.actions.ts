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

export const registrationPersonCreatedAudit = defineAuditAction("registration-person.created", {
  description: "A Registration User created a person in Registration Information",
  severity: "medium",
  target: "registration-person",
});

export const registrationPersonUpdatedAudit = defineAuditAction("registration-person.updated", {
  description: "A Registration User changed a person in Registration Information",
  requiresChanges: true,
  severity: "medium",
  target: "registration-person",
});

export const registrationPortraitReplacedAudit = defineAuditAction(
  "registration-portrait.replaced",
  {
    description: "A Registration User replaced a Participant portrait",
    requiresChanges: true,
    severity: "medium",
    target: "registration-portrait",
  },
);

export const teamDeletedAudit = defineAuditAction("team.deleted", {
  description: "A Team Owner deleted a Team and its Registration Information",
  severity: "critical",
  target: "team",
});

export const teamCreatedAudit = defineAuditAction("team.created", {
  description: "A Team Owner created a Team",
  severity: "low",
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

export const teamRegistrationReviewFinalizedAudit = defineAuditAction(
  "team-registration-review.finalized",
  {
    description: "A Registration Operator finalized a Team Registration Review decision",
    requiresChanges: true,
    severity: "critical",
    target: "team-registration-review",
  },
);
