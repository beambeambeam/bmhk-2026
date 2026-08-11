import type { TeamAccessProcedure, TeamOwnerProcedure } from "../../core/procedure";
import {
  legalConsentCreatedAudit,
  legalConsentUpdatedAudit,
  legalConsentWithdrawnAudit,
} from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import type { TeamConsentService } from "./team-consents.service";
import {
  createTeamConsentSchema,
  teamConsentSchema,
  teamConsentTeamInputSchema,
  updateTeamConsentSchema,
} from "./team-consents.schema";
import type { TeamConsent, UpdateTeamConsentData } from "./team-consents.schema";

const consentFields = [
  "codernTermsAccepted",
  "competitionRulesAccepted",
  "guardianConsentObtained",
  "healthDataConsent",
  "privacyPolicyAccepted",
  "publicityMediaConsent",
] as const satisfies readonly (keyof UpdateTeamConsentData)[];

function getConsentChanges(
  previous: TeamConsent,
  consent: TeamConsent,
  data: UpdateTeamConsentData,
) {
  const fields = consentFields.filter((field) => data[field] !== undefined);
  return {
    after: Object.fromEntries(fields.map((field) => [field, consent[field]])),
    before: Object.fromEntries(fields.map((field) => [field, previous[field]])),
  };
}

function isConsentWithdrawal(
  previous: TeamConsent,
  consent: TeamConsent,
  data: UpdateTeamConsentData,
): boolean {
  return consentFields.some((field) => data[field] === false && previous[field] && !consent[field]);
}

export function createTeamConsentsRouter(
  teamAccessProcedure: TeamAccessProcedure,
  teamOwnerProcedure: TeamOwnerProcedure,
  service: TeamConsentService,
) {
  return {
    create: teamOwnerProcedure
      .route({ method: "POST", tags: ["Team Consent"] })
      .input(createTeamConsentSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await executeAudited({
          audit: legalConsentCreatedAudit({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: { id: input.teamId, teamId: input.teamId },
          }),
          deniedErrorCodes: ["TEAM_NOT_FOUND"],
          execute: async () => await service.create(context.teamAccess, input),
          log: context.log,
          onSuccess: (created) => ({
            changes: {
              after: {
                codernTermsAccepted: created.codernTermsAccepted,
                competitionRulesAccepted: created.competitionRulesAccepted,
                guardianConsentObtained: created.guardianConsentObtained,
                healthDataConsent: created.healthDataConsent,
                privacyPolicyAccepted: created.privacyPolicyAccepted,
                publicityMediaConsent: created.publicityMediaConsent,
              },
            },
            target: {
              consentId: created.id,
              id: created.teamId,
              teamId: created.teamId,
              type: "legal-consent",
            },
          }),
        });

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
    get: teamAccessProcedure
      .route({ method: "GET", tags: ["Team Consent"] })
      .input(teamConsentTeamInputSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const consent = await service.get(context.teamAccess, input.teamId);

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
    update: teamOwnerProcedure
      .route({ method: "PATCH", tags: ["Team Consent"] })
      .input(updateTeamConsentSchema)
      .output(teamConsentSchema)
      .handler(async ({ context, input }) => {
        const requestedWithdrawal = consentFields.some((field) => input.data[field] === false);
        const auditAction = requestedWithdrawal
          ? legalConsentWithdrawnAudit
          : legalConsentUpdatedAudit;
        const result = await executeAudited({
          audit: auditAction({
            actor: { id: context.teamAccess.actorId, type: "user" },
            target: { id: input.teamId, teamId: input.teamId },
          }),
          deniedErrorCodes: ["TEAM_CONSENT_NOT_FOUND"],
          execute: async () => await service.update(context.teamAccess, input.teamId, input.data),
          log: context.log,
          onSuccess: ({ consent, previous }) => ({
            action: isConsentWithdrawal(previous, consent, input.data)
              ? legalConsentWithdrawnAudit.action
              : legalConsentUpdatedAudit.action,
            changes: getConsentChanges(previous, consent, input.data),
            target: {
              consentId: consent.id,
              id: consent.teamId,
              teamId: consent.teamId,
              type: "legal-consent",
            },
          }),
        });
        const { consent } = result;

        context.log.set({ teamConsent: { id: consent.id, teamId: consent.teamId } });
        return consent;
      }),
  };
}
