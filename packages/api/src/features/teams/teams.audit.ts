import type { ApiContext } from "../../core/context";
import type { TeamAccessContext } from "../../core/auth";

export type TeamAuditAction =
  | "team-advisor.create"
  | "team-advisor.document.replace"
  | "team-advisor.update"
  | "team-consent.create"
  | "team-consent.update"
  | "team-participant.create"
  | "team-participant.document.replace"
  | "team-participant.update"
  | "team.award.set"
  | "team.create"
  | "team.delete"
  | "team.image.replace"
  | "team.update";

export function auditTeamMutation(
  log: ApiContext["log"],
  access: TeamAccessContext,
  action: TeamAuditAction,
  teamId: string,
): void {
  log.audit({
    action,
    actor: { id: access.actorId, type: "user" },
    target: { id: teamId, type: "team" },
  });
  log.set({ authorization: { scope: access.scope } });
}
