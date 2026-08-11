import { defineAuditAction } from "evlog";

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
